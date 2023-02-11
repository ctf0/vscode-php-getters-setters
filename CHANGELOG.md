# Change Log

## 0.0.1

- use php-parser for all lookups
- fix adding getter/setter for the same property
- move Resolver class to its own file instead of cluttering the extension file
- remove most of the commands and convert them to a multi select
- jump to method end line instead of start
- add cmnd to remove property + its setter/getter
- add support to property promotion (php8)
- remove editor context menu entries & instead use code action
- remove hardcoded templates & use files instead
- remove most of the config keys & rely on templates files to set the desired outcome
- remove default template directories creation & rely on the user config instead
- much smaller pkg size
- add cmnd to add new (property/property promotion, constructor)

## 0.0.2

- support adding property to method, same as constructor, cmnd will add property based on the cursor location

## 0.0.3

- support adding property to method in interfaces

## 0.0.5

- fix `Add To All Properties` not working if no constructor is found
- better commands titles
- better undo/redo

## 0.0.6

- add new config `phpGettersSetters.showReadonly`
- fix add property to normal methods
