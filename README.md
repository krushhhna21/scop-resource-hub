# Pharm D Navigator

A comprehensive digital resource management system for Pharm D students at Shivlingeshwar College of Pharmacy (SCOP), providing access to books, previous year questions, journals, publications, career resources, and more.

## 🚀 Features

- **📚 Books Library**: Organized by year and subject with file uploads and external links
- **📝 Previous Year Questions**: Year-based organization for easy access to past papers  
- **📖 Journals & Publications**: Simple page-based content management
- **💼 Career Resources**: Career guidance and opportunities
- **📁 General Resources**: Additional study materials and resources
- **🔐 Admin Dashboard**: Complete content management system
- **📱 Responsive Design**: Works on all devices

## 🏗️ Tech Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: PHP 7.4+, MySQL
- **Architecture**: RESTful API with PDO database layer
- **Upload System**: File handling with MIME type validation
- **Authentication**: Session-based admin authentication

## 📋 Requirements

- PHP 7.4 or higher
- MySQL 5.7 or higher
- Web server (Apache/Nginx)
- PDO MySQL extension

## 🛠️ Installation

### Local Development (XAMPP)

1. **Clone the repository**
   ```bash
   git clone https://github.com/krushhhna21/Pharm-D-Navigator.git
   cd Pharm-D-Navigator
   ```

2. **Set up database**
   ```bash
   mysql -u root -p < schema.sql
   mysql -u root -p < updates.sql
   ```

3. **Configure database connection**
   ```bash
   cp backend/api/config.local.php backend/api/config.php
   ```
   Edit `backend/api/config.php` with your local database credentials.

4. **Create admin user**
   ```bash
   php create_admin_user.php
   ```

5. **Set upload permissions**
   ```bash
   chmod 755 backend/uploads
   ```

6. **Access the application**
   - Student View: `http://localhost/scop-resource-hub/public/index.html`
   - Admin Dashboard: `http://localhost/scop-resource-hub/public/admin-login.html`
   - Default admin credentials: `admin` / `admin123`

### Hosting Deployment

1. **Upload files** to your web hosting account

2. **Create database** using your hosting control panel

3. **Import database schema**
   - Import `schema.sql` through phpMyAdmin or similar tool
   - Import `updates.sql` for additional schema updates

4. **Configure for hosting**
   ```bash
   cp backend/api/config.hosting.php backend/api/config.php
   ```
   Update the credentials in `config.php` with your hosting database details.

5. **Create admin user** by running the seed script through your hosting's file manager or terminal

## API Endpoints
All endpoints are on `backend/api/routes.php?action=...`

- `GET action=list_years`
- `GET action=list_subjects&year_id=...`
- `GET action=list_resources&subject_id=...`
- `POST action=increment_view` — body: `resource_id`
- `POST action=admin_login` — body: `username`, `password`
- `POST action=admin_logout`
- `GET action=admin_me`
- `GET action=admin_stats`
- `GET action=admin_list_resources[&q=...]`
- `POST action=admin_create_resource` — multipart upload
- `POST action=admin_delete_resource` — body: `resource_id`
- `GET action=list_all_subjects` — helper for admin upload dropdowns
