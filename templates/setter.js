module.exports = (property) => {
    let type = property.getTypeHint();
    let name = property.getName();
    let getterDesc = property.getDescription() || '';
    let setterDesc = property.setterDescription() || '';

    let docs = '';

    if (type) {
        type = type.replace(/( )?\$.*/, '');

        if (type.match(/[\>\]]/)) {
            docs = `
    /**
     * ${setterDesc}
     *
     * @param ${type} \$${name}${getterDesc ? ` ${getterDesc}` : ''}
     */`;
        }

        if (type.match(/array(?!\s*<)/)) {
            docs = `
    /**
     * ${setterDesc}
     *
     * @param ${type}<mixed> \$${name}${getterDesc ? ` ${getterDesc}` : ''}
     */`;
        }

        type = type ? `${type} ` : '';
    }

    return docs + `
    public function ${property.setterName()}(${docs ? '' : type}\$${name}): self
    {
        $this->${name} = \$${name};

        return $this;
    }
`;
};
