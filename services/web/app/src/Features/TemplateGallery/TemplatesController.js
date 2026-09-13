const SessionManager = require('../Authentication/SessionManager')
const TemplatesManager = require('./TemplatesManager')
const { Template } = require('../../models/TemplateGallery')
const { expressify } = require('@overleaf/promise-utils')
const logger = require('@overleaf/logger')

const MAX_LIMIT = 100
const DEFAULT_LIMIT = 50

function parsePagination(value, defaultValue) {
  const parsed = Number.parseInt(value, 10)

  if (!Number.isFinite(parsed) || parsed < 1) {
    return defaultValue
  }

  return parsed
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const TemplatesController = {
  async createProjectFromTemplate(req, res) {
    const { templateId } = req.body || {}

    if (!templateId || typeof templateId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'templateId is required',
      })
    }

    const userId = SessionManager.getLoggedInUserId(req.session)

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      })
    }

    const project = await TemplatesManager.promises.createProjectFromTemplate(
      templateId,
      userId
    )

    if (!project) {
      throw new Error('Failed to create project from template')
    }

    return res.redirect(`/project/${project._id}`)
  },

  async listTemplates(req, res) {
    try {
      const {
        category,
        subcategory,
        search,
      } = req.query

      const page = parsePagination(req.query.page, 1)

      let limit = parsePagination(
        req.query.limit,
        DEFAULT_LIMIT
      )

      limit = Math.min(limit, MAX_LIMIT)

      const filter = {
        isActive: true,
      }

      if (category && typeof category === 'string') {
        filter.category = category.trim()
      }

      if (subcategory && typeof subcategory === 'string') {
        filter.subcategory = subcategory.trim()
      }

      if (search && typeof search === 'string') {
        const normalizedSearch = search.trim()

        if (normalizedSearch.length > 0) {
          const regex = new RegExp(
            escapeRegex(normalizedSearch),
            'i'
          )

          filter.$or = [
            { title: regex },
            { description: regex },
            { author: regex },
          ]
        }
      }

      const skip = (page - 1) * limit

      const [templates, totalCount, categories, subcategories] =
        await Promise.all([
          Template.find(filter)
            .select(
              [
                'title',
                'description',
                'category',
                'subcategory',
                'author',
                'previewImage',
                'previewFile',
                'createdAt',
                'updatedAt',
                'version',
              ].join(' ')
            )
            .sort({
              category: 1,
              subcategory: 1,
              title: 1,
            })
            .limit(limit)
            .skip(skip)
            .lean(),

          Template.countDocuments(filter),

          Template.distinct('category', {
            isActive: true,
          }),

          Template.distinct('subcategory', {
            isActive: true,
          }),
        ])

      return res.json({
        success: true,

        data: {
          templates,

          pagination: {
            total: totalCount,
            page,
            limit,
            pages: Math.ceil(totalCount / limit),
          },

          filters: {
            categories: categories.sort(),
            subcategories: subcategories
              .filter(Boolean)
              .sort(),
          },
        },
      })
    } catch (error) {
      logger.error(
        {
          err: error,
        },
        'Failed to list templates'
      )

      return res.status(500).json({
        success: false,
        error: 'Failed to fetch templates',
      })
    }
  },

  async getTemplate(req, res) {
    try {
      const { id } = req.params

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Template id is required',
        })
      }

      const template = await Template.findOne({
        _id: id,
        isActive: true,
      }).lean()

      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Template not found',
        })
      }

      return res.json({
        success: true,
        data: template,
      })
    } catch (error) {
      logger.error(
        {
          err: error,
          templateId: req.params.id,
        },
        'Failed to get template'
      )

      // Invalid MongoDB ObjectId should not be treated as server failure
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          error: 'Invalid template id',
        })
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to fetch template details',
      })
    }
  },

  async getCategories(req, res) {
    try {
      const categories = await Template.aggregate([
        {
          $match: {
            isActive: true,
          },
        },

        {
          $group: {
            _id: {
              category: '$category',
              subcategory: '$subcategory',
            },
            count: {
              $sum: 1,
            },
          },
        },

        {
          $group: {
            _id: '$_id.category',

            subcategories: {
              $push: {
                name: '$_id.subcategory',
                count: '$count',
              },
            },

            total: {
              $sum: '$count',
            },
          },
        },

        {
          $project: {
            _id: 0,
            category: '$_id',
            total: 1,
            subcategories: 1,
          },
        },

        {
          $sort: {
            category: 1,
          },
        },
      ])

      return res.json({
        success: true,
        data: categories,
      })
    } catch (error) {
      logger.error(
        {
          err: error,
        },
        'Failed to get categories'
      )

      return res.status(500).json({
        success: false,
        error: 'Failed to fetch categories',
      })
    }
  },
}

module.exports = {
  createProjectFromTemplate: expressify(
    TemplatesController.createProjectFromTemplate
  ),

  listTemplates: expressify(
    TemplatesController.listTemplates
  ),

  getTemplate: expressify(
    TemplatesController.getTemplate
  ),

  getCategories: expressify(
    TemplatesController.getCategories
  ),
}