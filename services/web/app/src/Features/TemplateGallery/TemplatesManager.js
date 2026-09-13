const { Project } = require('../../models/Project')
const { Template } = require('../../models/TemplateGallery')

const ProjectDetailsHandler =
  require('../Project/ProjectDetailsHandler')

const ProjectOptionsHandler =
  require('../Project/ProjectOptionsHandler').promises

const ProjectRootDocManager =
  require('../Project/ProjectRootDocManager').promises

const ProjectUploadManager =
  require('../Uploads/ProjectUploadManager')

const util = require('util')
const logger = require('@overleaf/logger')
const settings = require('@overleaf/settings')
const Errors = require('../Errors/Errors')
const ClsiCacheManager = require('../Compile/ClsiCacheManager')

const path = require('path')
const fs = require('fs')
const os = require('os')
const AdmZip = require('adm-zip')

const EXCLUDED_PREVIEW_FILES = new Set([
  'preview.pdf',
  'preview.png',
  'preview.jpg',
  'preview.jpeg',
  'thumbnail.jpg',
  'thumbnail.jpeg',
])

function isSafeZipEntry(entryName) {
  if (!entryName || typeof entryName !== 'string') {
    return false
  }

  // Reject absolute Unix paths
  if (entryName.startsWith('/')) {
    return false
  }

  // Reject Windows absolute paths
  if (/^[a-zA-Z]:[\\/]/.test(entryName)) {
    return false
  }

  const normalizedPath = path.posix.normalize(
    entryName.replace(/\\/g, '/')
  )

  // Prevent path traversal
  if (
    normalizedPath === '..' ||
    normalizedPath.startsWith('../')
  ) {
    return false
  }

  return true
}

const TemplatesManager = {
  async createProjectFromTemplate(templateId, userId) {
    const template = await Template.findOne({
      _id: templateId,
      isActive: true,
    })

    if (!template) {
      throw new Errors.NotFoundError(
        'Template not found'
      )
    }

    if (!template.filePath) {
      throw new Errors.NotFoundError(
        'Template file not found'
      )
    }

    const projectName =
      ProjectDetailsHandler.fixProjectName(
        template.title
      )

    const templateRoot = path.resolve(
      settings.path.templateFolder
    )

    const templatePath = path.resolve(
      templateRoot,
      template.filePath
    )

    /*
     * Make sure the template archive is inside
     * the configured template directory.
     */
    if (
      !templatePath.startsWith(
        templateRoot + path.sep
      )
    ) {
      throw new Error(
        'Invalid template path'
      )
    }

    const tempZipPath = path.join(
      os.tmpdir(),
      `overleaf-template-${template._id}-${Date.now()}.zip`
    )

    try {
      await TemplatesManager._createFilteredZip(
        templatePath,
        tempZipPath
      )

      const attributes = {
        templateId: template._id,
        templateVersion: template.version,
      }

      const project =
        await ProjectUploadManager.promises
          .createProjectFromZipArchiveWithName(
            userId,
            projectName,
            tempZipPath,
            attributes
          )

      if (!project) {
        throw new Error(
          'Failed to create project from template'
        )
      }

      /*
       * Prepare CLSI cache. This is intentionally
       * started before project configuration.
       */
      const prepareClsiCache =
        ClsiCacheManager.prepareClsiCache(
          project._id,
          userId,
          {
            templateId: template._id,
            templateVersion: template.version,
          }
        ).catch(error => {
          logger.warn(
            {
              err: error,
              templateId: template._id,
              templateVersion: template.version,
              projectId: project._id,
            },
            'Failed to prepare clsi-cache from template'
          )
        })

      await TemplatesManager._setCompiler(
        project._id,
        template.compiler
      )

      await TemplatesManager._setImage(
        project._id,
        template.imageName
      )

      await TemplatesManager._setMainFile(
        project._id,
        template.mainFile
      )

      await Project.updateOne(
        {
          _id: project._id,
        },
        {
          $set: {
            templateId: template._id,
            templateVersion: template.version,
          },
        }
      )

      /*
       * Keep the same behavior as the original implementation:
       * wait for cache preparation before returning.
       */
      await prepareClsiCache

      return project
    } finally {
      await fs.promises.rm(
        tempZipPath,
        {
          force: true,
        }
      )
    }
  },

  async _createFilteredZip(
    sourceZipPath,
    destinationZipPath
  ) {
    const zip = new AdmZip(sourceZipPath)
    const filteredZip = new AdmZip()

    for (const entry of zip.getEntries()) {
      if (!isSafeZipEntry(entry.entryName)) {
        throw new Error(
          `Unsafe path inside template archive: ${entry.entryName}`
        )
      }

      if (entry.isDirectory) {
        filteredZip.addFile(
          entry.entryName,
          Buffer.alloc(0)
        )

        continue
      }

      const fileName = path
        .basename(entry.entryName)
        .toLowerCase()

      if (
        EXCLUDED_PREVIEW_FILES.has(fileName)
      ) {
        logger.debug(
          {
            file: entry.entryName,
          },
          'Excluding template preview file from project'
        )

        continue
      }

      filteredZip.addFile(
        entry.entryName,
        entry.getData()
      )
    }

    await new Promise((resolve, reject) => {
      try {
        filteredZip.writeZip(
          destinationZipPath,
          error => {
            if (error) {
              reject(error)
              return
            }

            resolve()
          }
        )
      } catch (error) {
        reject(error)
      }
    })
  },

  async _setCompiler(projectId, compiler) {
    if (compiler == null) {
      return
    }

    await ProjectOptionsHandler.setCompiler(
      projectId,
      compiler
    )
  },

  async _setImage(projectId, imageName) {
    const projectImage =
      imageName || 'wl_texlive:2018.1'

    await ProjectOptionsHandler.setImageName(
      projectId,
      projectImage
    )
  },

  async _setMainFile(projectId, mainFile) {
    if (!mainFile) {
      return
    }

    await ProjectRootDocManager.setRootDocFromName(
      projectId,
      mainFile
    )
  },
}

module.exports = {
  promises: TemplatesManager,

  createProjectFromTemplate: util.callbackify(
    TemplatesManager.createProjectFromTemplate
  ),
}