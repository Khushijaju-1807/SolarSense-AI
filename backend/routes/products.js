const router = require('express').Router();
const { body, param } = require('express-validator');
const Product = require('../models/Product');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');
const wrap = require('../utils/wrap');
const nextId = require('../utils/nextId');
const pick = require('../utils/pick');

const STOCK = ['In stock', 'Made to order', 'Out of stock'];
const FIELDS = ['name', 'category', 'price', 'unit', 'description', 'specs', 'stock', 'img'];
const codeRule = param('productId').matches(/^PR-\d+$/).withMessage('Invalid product ID.');

const rules = (opt) => {
  const f = (n) => (opt ? body(n).optional() : body(n));
  return [
    f('name').trim().isLength({ min: 3, max: 120 }).withMessage('Enter the product name.'),
    f('category').trim().isLength({ min: 2, max: 40 }).withMessage('Enter a category.'),
    f('price').isFloat({ min: 0, max: 10000000 }).withMessage('Enter a valid price.').toFloat(),
    body('unit').optional().trim().isLength({ min: 1, max: 20 }),
    body('description').optional().trim().isLength({ max: 300 }),
    body('specs').optional().isArray({ max: 6 }).withMessage('Add up to 6 specifications.'),
    body('specs.*').isString().trim().isLength({ min: 1, max: 80 }),
    body('stock').optional().isIn(STOCK).withMessage('Choose a valid stock status.'),
    body('img').optional({ values: 'falsy' }).matches(/^[\w\-./]{1,100}$/).withMessage('Use a simple image file name.')
  ];
};

/* Public: GET /api/products */
router.get('/', wrap(async (req, res) => {
  res.json(await Product.find().sort({ productId: 1 }).select('-__v').lean());
}));

router.post('/', protect, restrictTo('admin'), rules(false), validate, wrap(async (req, res) => {
  const product = await Product.create({
    ...pick(req.body, FIELDS),
    productId: await nextId('PR', Product, 'productId', 1001)
  });
  res.status(201).json(product);
}));

router.put('/:productId', protect, restrictTo('admin'), [codeRule, ...rules(true)], validate, wrap(async (req, res) => {
  const product = await Product.findOneAndUpdate({ productId: req.params.productId }, pick(req.body, FIELDS), { new: true, runValidators: true });
  if (!product) return res.status(404).json({ message: 'Product not found.' });
  res.json(product);
}));

router.delete('/:productId', protect, restrictTo('admin'), [codeRule], validate, wrap(async (req, res) => {
  const product = await Product.findOneAndDelete({ productId: req.params.productId });
  if (!product) return res.status(404).json({ message: 'Product not found.' });
  res.json({ message: 'Product deleted.' });
}));

module.exports = router;