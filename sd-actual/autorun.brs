function main()
	' This interface is the preferred way for JavaScript content to communicate with its parent application.
	' https://brightsign.atlassian.net/wiki/x/-gAeG
	mp = CreateObject("roMessagePort")

	' Create HTML Widget which is defined below in its own function
	widget = CreateHTMLWidget(mp)
    ' uncomment the next line for vertical
    'widget.SetTransform("rot90")
	widget.Show()

	' Enable SSH
	enableSSH()

	' Event Loop to view the events that are being sent from the HTML content.
	' The roHtmlWidgetEvent object is sent to the message port when an event occurs in the HTML content.
	while true
		msg = wait(0,mp)
		print "msg received - type=";type(msg)
		if type(msg) = "roHtmlWidgetEvent" then
			print "msg: ";msg
		end if
	end while
end function

function CreateHTMLWidget(mp as object) as object
	' Get Screen Resolution
	' https://brightsign.atlassian.net/wiki/x/SQUYFg
	vidmode = CreateObject("roVideoMode")
	width = vidmode.GetResX()
	height = vidmode.GetResY()

	sm=vidmode.GetScreenModes()
    ' uncomment this section for vertical
	sm[0].transform = "0"
	sm[0].video_mode="1920x1080x30p"
	vidmode.SetScreenModes(sm)

    'uncomment this section for horizontal
    r = CreateObject("roRectangle",0,0,1920,1080)

	' Create HTML Widget config
	'https://brightsign.atlassian.net/wiki/spaces/DOC/pages/370672896/roHtmlWidget#Initialization-Parameters
	config = {
		nodejs_enabled: true
		url: "file:///sd:/dist/index.html"
		inspector_server: {
			port: 2999
		}
		port: mp
	}

	' Create HTML Widget
	' https://brightsign.atlassian.net/wiki/x/AAUYFg
	h = CreateObject("roHtmlWidget",r,config)
	return h
end function

function enableSSH()
	regSSH = CreateObject("roRegistrySection", "networking")

	if type(regSSH) = "roRegistrySection" then
		regSSH.Write("ssh","22")
	endif

	n = CreateObject("roNetworkConfiguration", 0)
	n.SetLoginPassword("none")
	n.Apply()

	regSSH.Flush()
end function
