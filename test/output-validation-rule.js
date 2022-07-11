'use strict'

import Rule from '../output-validation-rule.js'
import Joi from 'joi'
import assert from 'assert'

describe('OutputValidationRule', () => {
  describe('.overlaps()', () => {
    it('properly detects when rules do not overlap', () => {
      const spec = { body: { a: Joi.any().required() } }
      const a = new Rule('200', spec)
      const b = new Rule('201', spec)

      assert.strictEqual(false, a.overlaps(b))
    })
  })
})
