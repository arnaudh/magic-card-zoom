.PHONY: test

ALL_SOURCES_AND_ASSETS := $(shell find src/ assets/metadata/ assets/indexes/ config.json)
GIT_SHA := $(shell git rev-parse --short HEAD)

download-images-and-metadata:
	node src/js/util/download_all.js

index-images:
	node src/js/util/index_images.js

clean:
	rm -r build/ || true

build: $(ALL_SOURCES_AND_ASSETS)
	node src/js/build/build.js | tee build.log
	@# fail if some files were not located by the copy-webpack-plugin
	@! grep -q 'unable to locate' build.log || (rm -r build/; exit 1)
	@echo 'Build done: build/'

test:
	yarn test --recursive test/unit/

test-watch:
	yarn test-watch

integration-test: build
	yarn test --recursive test/integration/

git-check-uncommitted:
	git diff-index --quiet HEAD -- || (echo 'Uncommitted changes - aborting'; exit 1)

package: git-check-uncommitted test integration-test build
	zip -FS magic-card-zoom-$(GIT_SHA).zip -r build/
	@echo 'Packaging done: magic-card-zoom-$(GIT_SHA).zip'
