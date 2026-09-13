import { Template } from '../app/src/models/TemplateGallery.js'

const templates = [
  {
    title: 'Turing Machine',
    description: 'Turing machine LaTeX template.',
    category: 'Scientific',
    subcategory: 'Computer Engineering',
    author: 'IUST',
    version: 1,
    mainFile: 'main.tex',
    compiler: 'pdflatex',
    filePath: 'scientific/computer-engineering/turing-machine.zip',
    previewFile: 'turing.pdf',
    previewImage: null,
    isActive: true,
  },

  {
    title: 'Seven Segment Display',
    description: 'Seven segment display LaTeX template.',
    category: 'Scientific',
    subcategory: 'Computer Engineering',
    author: 'IUST',
    version: 1,
    mainFile: 'main.tex',
    compiler: 'pdflatex',
    filePath:
      'scientific/computer-engineering/seven-segment-display.zip',
    previewFile: 'seven.pdf',
    previewImage: null,
    isActive: true,
  },

  {
    title: 'Anatomy of a C Function',
    description: 'Anatomy of a C function LaTeX template.',
    category: 'Scientific',
    subcategory: 'Computer Engineering',
    author: 'IUST',
    version: 1,
    mainFile: 'main.tex',
    compiler: 'pdflatex',
    filePath:
      'scientific/computer-engineering/anatomy-of-a-c-function.zip',
    previewFile: 'anatomy.pdf',
    previewImage: null,
    isActive: true,
  },
]

async function seedTemplates() {
  try {
    for (const template of templates) {
      await Template.updateOne(
        { filePath: template.filePath },
        { $set: template },
        { upsert: true }
      )

      console.log(`Seeded: ${template.title}`)
    }

    console.log('Template gallery seeded successfully.')
  } catch (error) {
    console.error('Failed to seed templates:', error)
    process.exitCode = 1
  }
}

await seedTemplates()
