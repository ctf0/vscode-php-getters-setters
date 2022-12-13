# PHP Getters/Setters

based on https://github.com/cvergne/vscode-php-getters-setters + enhancements

## Enhancements (check [Notes](#notes))

* Remove Property + getter/setter
* add (property/property promotion, constructor)
* Check [CHANGELOG](CHANGELOG.md) for changes

## Custom Templates

By default the extension will generate getters & setters using its own templates but you can fully customise the markup used to generate them,
by setting `phpGettersSetters.templatesDir` with the path to the directory that holds both your `getter/setter.js`.

- Sample getter.js template:

```js
module.exports = (property) => `
    /**
     * ${property.getterDescription()}
     *
     * @return  ${property.getType() ? property.getType() : 'mixed'}
     */
    public function ${property.getterName()}()
    {
        return $this->${property.getName()};
    }
`
```

- Sample setter.js template:

```js
module.exports = (property) => `
    /**
     * ${property.setterDescription()}
     *
     * @param   ${property.getType() ? property.getType() : 'mixed'}  \$${property.getName()}  ${property.getDescription() ? property.getDescription() : ''}
     *
     * @return self
     */
    public function ${property.setterName()}(${property.getTypeHint() ? property.getTypeHint() + ' ' : '' }\$${property.getName()})
    {
        $this->${property.getName()} = \$${property.getName()};
        return $this;
    }
`
```

As you can see a [Property](src/Contracts/Property.ts) object is passed to templates so you can access any public method there. I also like the idea of adding more stuff as users find limits. Open an issue if you find something you cannot achieve.

## Notes

- Does NOT support different classes in a single document.
- its recommended to add each `property/property promotion` on its own line
- the ext will detect when the cursor is at a constructor and add a property promotion, otherwise it will add the new property to the class scope
