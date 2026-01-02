prep:
	npm install

build:
	npm run build

publish: build
	rm -Rf sd/*
	mkdir sd/dist
	cp -R dist/* sd/dist/
	cp src/autorun.brs sd/
	cp *mp4 sd/
	tree sd/

clean:
	-rm -Rf *.bsfw
	rm -Rf sd/*
	rm -Rf dist/*
	rm -Rf node_modules
	rm -Rf .DS_Store
