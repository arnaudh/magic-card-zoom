.PHONY: build test

GIT_SHA := $(shell git rev-parse --short HEAD)

git-check-uncommitted:
	git diff-index --quiet HEAD -- || (echo 'Uncommitted changes - aborting'; exit 1)

watch:
	node src/js/build/webserver.js

test:
	yarn test --recursive test/unit/

integration-test:
	yarn test test/integration/build_test.js

test-watch:
	yarn test-watch

build:
	node src/js/build/build.js

package: git-check-uncommitted test integration-test build
	zip -FS magic-card-zoom-$(GIT_SHA).zip -r build/
	@echo 'Packaging done: magic-card-zoom-$(GIT_SHA).zip'
