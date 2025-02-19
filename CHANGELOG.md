<!-- markdownlint-disable no-duplicate-header -->
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

* Added pod logs viewer
* Added jump to list for all screens to avoid back button confusion

## [4.1.0-rc.1] - 2022-05-09

### Added

* Added view kube yaml for pod
* Added view kube yaml for container
* Pods section processes
* Pods section list
* Pods section inspect
* Multiple container engine support
* Docker engine support
* Podman and Docker support for operating modes
* Adaptive color scheme to dissociate between engines (original for podman and blue for docker)
* Ability to customize path to podman / docker and their connection strings
* Ability to test custom configuration
* Ability to save customization and restore defaults
* Ability to detect what is currently available
* Full support for custom LIMA instance and WSL distributions for both engines
* 45: Added support for Windows Terminal as tool for "Open terminal" functionality
* Ability to dissociated between container states using colors
* Refactored the entire application to support any container engine easily

## Changed

* Improved error messages everywhere
* Changed configuration and logging location, less screen vertical real-estate used
* Upgraded all dependencies to their most recent supported versions

## Fixed

* 56: Podman machine startup / shutdown

## [4.0.3-rc.5] - 2022-04-23

### Added

* Connection system
* Experimental Docker API

### Changed

* 47: Allow custom connection string
* Connection UI
* Various UI improvements
* Disable screens not making sense when using certain engines

## [4.0.3-rc.4] - 2022-04-18

### Fixed

* 44: Fix Open in Browsers due to schema changes
* 49: UI freezes on Start a new container
* Overflow issues triggering vertical & horizontal scrolling
* Bug with pause / resume of containers

### Added

* 43: Restore LIMA
* Ability to switch logging to original console, to avoid losing lines
* Add more info about the environment where podman is running
* Port mappings as array of items - ability to map any port/protocol
* Add created counter on dashboard

### Changed

* Improved detection of locally available podman, podman machine, LIMA
* Ability to connect without restart when switching engines (from native to machine, from machine to lima and back)
* Improved error handling and notifications
* Simplified logging

### Removed

* Removed worker PRC - proxy all through Electron IPC
* CLI backend for communication - it was too limiting

## [4.0.3-rc.3] - 2022-04-18

### Added

* Builds for `M1` architecture
* Counters for `paused` and `exited` on Dashboard screen
* Ability to `pause / unpause` a container
* Basic `System Tray` support (restore window & quit - no startup to tray)

### Fixed

* Fix Dashboard wrong counters
* Fixed icon path in development mode
* Fixed window restoration on MacOS

### Changed

* Added HTTP response `ok` state interpretation
* Changed build pipeline to be more explicit
* Added `DecodedState` computed property to `Container` type to avoid miss-match data when requesting lists vs single items
* Rephrased counters for running containers

### Removed

* Removed extra `Status` column from `Containers` list screen

## [4.0.3-rc.2] - 2022-04-16

* initial flatpak support (not yet flathub)
* solve custom program path setting bug

## [4.0.3-b.5] - 2022-04-15

* Fix improper request body proxy-ing to worker affecting requests methods with body
* Add BDD initial testing for the client

## [4.0.3-b.4] - 2022-04-14

* Add `cli` fallback when `api` is not available
* Refactor settings UI to allow toggling of `cli` fallback

## [4.0.3-b.3] - 2022-04-13

* Properly respect build environment

## [4.0.3-b.2] - 2022-04-13

* Enable debug panel for production builds

## [4.0.3-b.1] - 2022-04-13

* Ability to control logging level and debug the application
* Provider more information and control over startup and internals

## [4.0.0-b.2] - 2022-04-13

* Exposed application configuration storage path for the user to be informed
* Ability to turn auto-start on or off
* Ability to re-connect
* Changed bootstrap procedure using phases/states to improve detection
* Improved bootstrap failure reasons
* Use a single configuration source
* Wrapped logging into its own module to support switching
* Clean-up of old artifacts

## [4.0.0-b.1] - 2022-04-09

* Upgrade to support podman `4.0.x`
* Upgrade to blueprint 4.x
* Support Windows
* Support MacOS
* Dropped Lima temporarily until better configuration exists

## [3.4.2-alpha.4] - 2022-02-06

### Fixed

* 14: Automatic detection failed (macOs Catalina)

## [3.4.2-alpha.3] - 2021-12-08

Support MacOS using lima, native read write mounts and terminal console

## [3.4.2-alpha.2] - 2021-12-08

Address tech debt and allow easier development.

### Changed

* Split `easy-peasy` model
* Changed application folder structure
* Add logging for all http requests with curl command construction
* Fix request parameters
* Fix secrets creation

### Added

* Prepare bundling

## [3.4.2-alpha.1] - 2021-12-06

### Added

* Initial release
