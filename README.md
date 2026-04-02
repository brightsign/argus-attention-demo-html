# Argus-Attention Detection Demo

This demo HTML/JS application showcases the tech behind the NPU that is enabled in Brightsign players.  This demo shows:

- Full motion video
- A "picture-in-picture" of what the camera AI "sees" - including bounding boxes around faces
  - faces looking at the screen will be bounded in green, otherwise red

## Just Use It!

1. ensure you have all the pre-requisites per the [BSMP](https://github.com/brightsign/argus-audience-measurement-extension)
2. copy the contents of the 'sd' folder to an SD card
3. copy the [BSMP](https://github.com/brightsign/argus-audience-measurement-extension/releases/download/v0.5.0/cobra-standalone-npu_argus-1775002227.bsfw) onto the SD card
4. place the SD card into the player and boot
5. Observe!

## Prerequisites

This project assumes you are working in Linux.  On MacOS we get an error in the dependencies:

```
npm error Error: Cannot find module 'node-bin-darwin-arm64/package.json'
```

You can also just use a Linux container to do the build steps.  The container we often use is

* [brightsign-dev-container](https://github.com/brightsign/brightsign-dev-container)

## Building the App

First, clone the repository. Then, from the home directory of this repo:

```
make prep
make build
```

You should now see a `node_modules/` and `dist/` folder now in your repository. The code in `dist/` is the built application.

## Deploying the Application

The easiest way to build the file folder you need is to:

```
make publish
```

This should place all the files you need into the "sd" folder.  It should look like this:

```sh
sd
├── autorun.brs
├── dist
│   ├── bundle.js
│   └── index.html
└── meet-brightsign.mp4
```

## Ensure the BSMP is Installed

The makefile automatically downloads and copies the BSMP to the sd folder.  However, if you want to manually do this step:

* download the [argus-attention detection bsfw installation package](https://github.com/BrightSign-Playground/argus-audience-measurement-extension/releases/download/v0.5.0/cobra-standalone-npu_argus-1775002227.bsfw)
* copy the file to the root of the SD card
* it will be automatically installed on the next boot

## Licensing

This project is released under the terms of the [Apache 2.0 License](./LICENSE.txt).
