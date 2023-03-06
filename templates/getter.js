module.exports = (property) => {
    let type = property.getTypeHint();
    let desc = property.getterDescription() || '';
    let docs = '';

    if (type) {
        type = type.replace(/( )?\$.*/, '');

        if (type.match(/[\>\]]/)) {
            docs = `
    /**
     * ${desc}
     *
     * @return ${type}
     */`;
        }

        if (type.match(/array(?!\s*<)/)) {
            docs = `
    /**
     * ${desc}
     *
     * @return ${type}<mixed>
     */`;
        }
    }

    return docs + `
    public function ${property.getterName()}()${docs ? '' : `: ${type}`}
    {
        return $this->${property.getName()};
    }
`;
};
