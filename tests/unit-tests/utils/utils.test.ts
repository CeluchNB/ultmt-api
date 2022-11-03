import { parseBoolean } from '../../../src/utils/utils'

describe('test parse boolean', () => {
    it('should parse true', () => {
        const result = parseBoolean('true')
        expect(result).toBe(true)
    })

    it('should parse false', () => {
        const result = parseBoolean('false')
        expect(result).toBe(false)
    })

    it('should parse undefined', () => {
        const result = parseBoolean('')
        expect(result).toBeUndefined()
    })
})
