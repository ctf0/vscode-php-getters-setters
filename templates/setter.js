module.exports = (property) => {
    let type = property.getTypeHint()
    let name = property.getName()
    let desc = property.getDescription() || ''

    let docs = ''

    if (type) {
        if (type.match(/[\>\]]/)) {
            docs = `
    /**
     * ${property.setterDescription()}
     *
     * @param ${type} \$${name}${desc ? ` ${desc}` : ''}
     */`
        }

        if (type.match(/array(?!\s*<)/)) {
            docs = `
    /**
     * ${property.setterDescription()}
     *
     * @param ${type}<mixed> \$${name}${desc ? ` ${desc}` : ''}
     */`
        }

        type = type ? `${type} ` : ''
    }

    return docs + `
    public function ${property.setterName()}(${docs ? '' : type}\$${name}): self
    {
        $this->${name} = \$${name};

        return $this;
    }
`
}
