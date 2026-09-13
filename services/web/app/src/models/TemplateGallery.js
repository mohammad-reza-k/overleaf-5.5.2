const mongoose = require('../infrastructure/Mongoose')
const { Schema } = mongoose

const TemplateSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: '',
      trim: true,
    },

    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    subcategory: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },

    author: {
      type: String,
      default: '',
      trim: true,
    },

    version: {
      type: Number,
      default: 1,
      min: 1,
    },

    mainFile: {
      type: String,
      default: 'main.tex',
      trim: true,
    },

    compiler: {
      type: String,
      default: 'pdflatex',
      trim: true,
    },

    previewFile: {
      type: String,
      default: null,
      trim: true,
    },

    imageName: {
      type: String,
      default: null,
      trim: true,
    },

    filePath: {
      type: String,
      required: true,
      trim: true,
    },

    previewImage: {
      type: String,
      default: null,
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)


TemplateSchema.index({
  category: 1,
  subcategory: 1,
})


TemplateSchema.index({
  title: 'text',
  description: 'text',
  author: 'text',
})

exports.Template = mongoose.model(
  'Template',
  TemplateSchema
)