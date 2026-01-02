# Argus-Attention Detection Demo - Design Document

## Overview

This project is a **BrightSign digital signage application** that demonstrates real-time face detection and attention tracking using BrightSign's NPU (Neural Processing Unit) capabilities. The application displays a looping video with an overlaid camera feed showing AI-processed face detection, along with live attention metrics.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BrightSign Player                                  │
│                                                                              │
│  ┌──────────────┐    ┌─────────────────────────────────────────────────┐    │
│  │              │    │              HTML Widget (roHtmlWidget)          │    │
│  │  autorun.brs │───▶│  ┌─────────────────────────────────────────┐    │    │
│  │  (Bootstrap) │    │  │           Web Application                │    │    │
│  │              │    │  │  ┌─────────┐ ┌─────────┐ ┌───────────┐  │    │    │
│  └──────────────┘    │  │  │  Video  │ │  Image  │ │    UDP    │  │    │    │
│                      │  │  │  Player │ │  Poller │ │  Listener │  │    │    │
│                      │  │  └────┬────┘ └────┬────┘ └─────┬─────┘  │    │    │
│                      │  └───────┼───────────┼────────────┼────────┘    │    │
│                      └──────────┼───────────┼────────────┼─────────────┘    │
│                                 │           │            │                   │
│                                 ▼           │            │                   │
│                      ┌──────────────────┐   │            │                   │
│                      │ meet-brightsign  │   │            │                   │
│                      │     .mp4         │   │            │                   │
│                      │ (Background Vid) │   │            │                   │
│                      └──────────────────┘   │            │                   │
│                                             │            │                   │
└─────────────────────────────────────────────┼────────────┼───────────────────┘
                                              │            │
                    ┌─────────────────────────┼────────────┼─────────────────┐
                    │    NPU Extension        │            │                 │
                    │    (BSMP Package)       │            │                 │
                    │                         ▼            ▼                 │
                    │  ┌─────────────┐   ┌─────────┐  ┌─────────┐           │
                    │  │   Camera    │──▶│ /tmp/   │  │  UDP    │           │
                    │  │   + NPU     │   │ output  │  │  Port   │           │
                    │  │  Processing │   │  .jpg   │  │  5002   │           │
                    │  └─────────────┘   └─────────┘  └─────────┘           │
                    │                                                        │
                    │  Face Detection AI writes annotated frames             │
                    │  and sends attention metrics via UDP                   │
                    └────────────────────────────────────────────────────────┘
```

## Component Details

### 1. BrightScript Bootstrap (`src/autorun.brs`)

The entry point for the BrightSign player. Responsibilities:

- **Creates the HTML Widget** with Node.js support enabled (`nodejs_enabled: true`)
- **Configures display resolution** at 1920x1080 @ 30fps
- **Enables remote debugging** via inspector server on port 2999
- **Enables SSH access** on port 22 for development/debugging
- **Sets up message port** for communication between BrightScript and HTML content

Key configuration:
```brightscript
config = {
    nodejs_enabled: true
    url: "file:///sd:/dist/index.html"
    inspector_server: { port: 2999 }
    port: mp
}
```

The `nodejs_enabled` flag is critical - it allows the HTML/JavaScript application to use Node.js APIs like `fs` (filesystem) and `dgram` (UDP sockets) directly in the browser context.

### 2. Web Application (`src/index.js` + `src/index.html`)

A webpack-bundled JavaScript application that runs inside the BrightSign's Chromium-based HTML widget.

#### Display Layers (Z-order, back to front)

| Layer | Element | Purpose |
|-------|---------|---------|
| Background | `#video-container` | Full-screen looping video (z-index: -1) |
| Middle | `#image-container` | Camera feed with face detection overlay |
| Foreground | `#udp-messages` | Attention metrics banner (bottom 5%) |

#### Subsystems

**A. Video Playback**
- Loads `meet-brightsign.mp4` as full-screen background
- Configured for autoplay, muted, looping
- Uses CSS `object-fit: cover` to fill screen without letterboxing

**B. Image Polling System**
- Monitors `/tmp/output.jpg` for changes every 30ms (~33 FPS)
- Uses `fs.stat()` to check file modification timestamp (`mtimeMs`)
- Only reads file when timestamp changes (efficient polling)
- Converts image data to base64 data URL for display
- Preloads images to prevent flicker
- Auto-hides after 5 seconds of no updates (timeout handling)

**C. UDP Message Receiver**
- Listens on UDP port 5002 for JSON messages
- Expected message format:
  ```json
  {
    "faces_in_frame_total": 3,
    "faces_attending": 2
  }
  ```
- Updates the bottom banner with attention statistics

### 3. NPU Extension (External Dependency)

The `brightsign-npu-argus-attention-extension` package (installed as a `.bsfw` file) provides:

- Camera capture and NPU-accelerated face detection
- Annotated frame output to `/tmp/output.jpg` with bounding boxes:
  - **Green boxes**: Faces looking at the screen (attending)
  - **Red boxes**: Faces looking away (not attending)
- UDP broadcast of face count metrics to port 5002

## Data Flow

### Image Update Flow

```
NPU writes to /tmp/output.jpg
         │
         ▼
┌─────────────────────┐
│ fetchImage() polls  │◀─── Every 30ms
│ fs.stat(imagePath)  │
└─────────┬───────────┘
          │
          ▼
    ┌───────────┐
    │ mtimeMs   │───No change───▶ (skip read)
    │ changed?  │
    └─────┬─────┘
          │ Yes
          ▼
┌─────────────────────┐
│ fs.readFile()       │
│ Convert to base64   │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Preload in temp     │
│ Image object        │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Update visible      │
│ <img> element       │
└─────────────────────┘
```

### UDP Message Flow

```
NPU sends UDP to port 5002
         │
         ▼
┌─────────────────────┐
│ udpServer.on('msg') │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ JSON.parse(message) │
│ Validate structure  │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Update state vars:  │
│ - total_faces       │
│ - attending_faces   │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ updateBanner()      │
│ "X out of Y faces   │
│  are watching"      │
└─────────────────────┘
```

## Screen Layout

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│                                                                │
│                    Background Video                            │
│                  (meet-brightsign.mp4)                         │
│                    Full Screen Loop                            │
│                                                                │
│                                                                │
│                                                 ┌────────────┐ │
│                                                 │   Camera   │ │
│   70% from top ─────────────────────────────────│    Feed    │ │
│                                                 │  (20% h)   │ │
│   90% from left ────────────────────────────────┴────────────┘ │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│        "2 out of 3 faces are watching the session."            │
│                     (5% height banner)                         │
└────────────────────────────────────────────────────────────────┘
```

### Configurable Presentation Parameters

Located in `src/index.js` (lines 29-32):

```javascript
const IMAGE_LOCATION_TOP = 70;   // % from top
const image_location_left = 90;  // % from left
const vidPath = '/meet-brightsign.mp4';
```

## Build System

### Webpack Configuration

- **Entry**: `./src/index.js`
- **Target**: `node` (enables Node.js built-ins like `fs`, `dgram`)
- **Output**: `dist/bundle.js`
- **Plugins**: HtmlWebpackPlugin (copies index.html to dist/)
- **Externals**: @brightsign/* packages are excluded from bundling

### Build Commands

| Command | Description |
|---------|-------------|
| `make prep` | Install npm dependencies |
| `make build` | Run webpack build |
| `make publish` | Build + copy files to `sd/` folder for SD card |
| `make clean` | Remove all build artifacts |

### SD Card Structure (Deployment)

```
sd/
├── autorun.brs           # BrightScript bootstrap
├── dist/
│   ├── bundle.js         # Webpack bundle
│   └── index.html        # HTML entry point
├── meet-brightsign.mp4   # Background video
└── *.bsfw                # NPU extension package (optional)
```

## Runtime Dependencies

### On the BrightSign Player

1. **BrightSign OS** with HTML widget and Node.js support
2. **NPU Extension** (`brightsign-npu-argus-attention-extension`) installed
3. **Camera** connected to the player

### Inter-Process Communication

| Channel | Source | Destination | Data |
|---------|--------|-------------|------|
| Filesystem | NPU Extension | Web App | `/tmp/output.jpg` (annotated frames) |
| UDP 5002 | NPU Extension | Web App | JSON face count metrics |

## Timing Characteristics

| Parameter | Value | Notes |
|-----------|-------|-------|
| Image poll interval | 30ms | ~33 FPS effective rate |
| Image timeout | 5000ms | Hide image if no updates |
| UDP port | 5002 | Face detection metrics |
| Video mode | 1920x1080x30p | Full HD at 30fps |
| Debug inspector | Port 2999 | Chrome DevTools remote debugging |
| SSH access | Port 22 | Development access |

## Error Handling

### Image Polling
- File read errors are logged but don't crash the application
- Missing/stale images trigger auto-hide after 5-second timeout
- Timestamp comparison prevents unnecessary file reads

### UDP Messages
- Invalid JSON structures are logged and ignored
- Missing fields result in "N/A" display values
- UDP socket errors don't affect other subsystems

## Development Notes

### Remote Debugging

Connect Chrome DevTools to `http://<player-ip>:2999` for:
- JavaScript console access
- DOM inspection
- Network monitoring
- Performance profiling

### SSH Access

SSH is enabled on port 22 with password "none" for development convenience. **This should be secured for production deployments.**

### Display Orientation

The autorun.brs includes commented code for vertical (portrait) orientation:
```brightscript
' uncomment the next line for vertical
'widget.SetTransform("rot90")
```

## Limitations

1. **Polling-based image updates**: Not true real-time streaming; limited to ~33 FPS
2. **Single camera feed location**: Fixed to bottom-right quadrant (configurable via constants)
3. **UDP-only metrics**: No TCP fallback or acknowledgment
4. **Linux build requirement**: Node 14.x dependencies don't support macOS ARM64

## Future Considerations

- WebSocket-based streaming for lower latency image updates
- Multiple camera feed support
- Configurable UI via external config file
- Production-ready SSH/security configuration
- Analytics logging and reporting
