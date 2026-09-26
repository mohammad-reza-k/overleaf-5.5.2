# overleaf
Features Added:
. Admin User Management Panel
. Search and filter users
. View user information
. View users' last login
. Add new users
. Update user information
. Delete users
. Admin activity/log tracking
. Template Gallery / Template Panel
. Browse templates by category
. View template details and description
. Preview templates using PDF previews
. View template source files
. Create a new project from a selected template
. Organize templates into categories

path to the files added:
. template gallery containing zip files of the resource of the templates must be installed on server locally. refrence to htts://github.com/mohammad-reza-k/
. template stored metadata => overleaf/services/web/app/src/models/TemplateGallery.js
. template seed for storing => overleaf/services/web/app/src/scripts/seedTemplate.mjs
. template api => overleaf/services/web/app/src/Features/TemplateGallery
. admin panel api => overleaf/services/web/app/Features/ServerAdmin
