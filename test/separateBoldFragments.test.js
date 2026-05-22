const separateBoldFragments = require('../main/utils/separateBoldFragments')

test('Separar correctamente los fragmentos en negrita', () => {
  const text = '¿Permitirle a *Puntos de atención*\n acceder a tu ubicación?'
  const expectedFragments = [
    { type: 'text', content: '¿Permitirle a ' },
    { type: 'bold', content: 'Puntos de atención' },
    { type: 'text', content: '\n acceder a tu ubicación?' }
  ]
  const result = separateBoldFragments(text)
  expect(result).toEqual(expectedFragments)
})
