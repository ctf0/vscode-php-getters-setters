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

## 0.0.7

- fix `add property` error
- fix `add property` snippet
- fix getter/setter templates when property doc has the variable included

## 0.0.8

- remove code refactor and move it to its own extension

## 0.1.0

- allow the extension to work regardless of parsing errors

## 0.1.1

- fix nullable types [#1](https://github.com/ctf0/vscode-php-getters-setters/issues/1), make sure to update your custom template files with the new changes from the included ones (`templates/getter.js` & `templates/setter.js`).

## 0.2.0

- fix not removing annotation
- now works inside traits as well
