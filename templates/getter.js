module.exports = (property) => {
    let type = property.getTypeHint()
    let docs = ''

    if (type) {
        if (type.match(/[\>\]]/)) {
            docs = `
    /**
     * ${property.getterDescription()}
     *
     * @return ${type}
     */`
        }

        if (type.match(/array(?!\s*<)/)) {
            docs = `
    /**
     * ${property.getterDescription()}
     *
     * @return ${type}<mixed>
     */`
        }
    }

    return docs + `
    public function ${property.getterName()}()${docs ? '' : `: ${type}`}
    {
        return $this->${property.getName()};
    }
`
}
