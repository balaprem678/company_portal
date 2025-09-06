const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Multer Storage Configuration for uploading Excel
const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        callback(null, uploadDir);
    },
    filename: (req, file, callback) => {
        callback(null, Date.now() + path.extname(file.originalname)); // Avoid name conflicts
    }
});

const upload = multer({ storage: storage });

// Middleware to process the Excel file
const processExcelFile = (req, res, next) => {
    if (req.file) {
        try {
            const filePath = path.join(__dirname, 'uploads', req.file.filename);
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Convert the sheet data to JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            // Attach JSON data to the request object
            req.excelData = jsonData;

            // Optionally, delete the file after processing
            fs.unlinkSync(filePath);

            next();  // Continue to the next middleware/handler
        } catch (error) {
            console.error('Error processing Excel file:', error);
            return res.status(500).json({ status: 0, message: 'Error processing Excel file' });
        }
    } else {
        return res.status(400).json({ status: 0, message: 'No file uploaded' });
    }
};

// Middleware to handle the full process (upload and parsing Excel)
const uploadExcelAndProcess = (req, res, next) => {
    upload.single('xlsheet')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ status: 0, message: 'File upload failed' });
        }
        processExcelFile(req, res, next); // Call the Excel processing function
    });
};

module.exports = { uploadExcelAndProcess };