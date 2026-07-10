const express = require("express");
const Jimp = require("jimp");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const axios = require("axios");  // ต้องติดตั้ง: npm install axios

const app = express();
const PORT = process.env.PORT || 3000;

// ===============================
// Create Upload Folder
// ===============================
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// ===============================
// Static Files
// ===============================
app.use(express.static("public"));
app.use("/image", express.static(path.join(__dirname, "image")));
app.use("/uploads", express.static(uploadDir));

// ===============================
// Multer Upload Config
// ===============================
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
        const ext = path.extname(file.originalname);
        const filename = Date.now() + ext;
        cb(null, filename);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// ===============================
// Home Page
// ===============================
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ===============================
// Logo Pixel API (ตัวอย่าง)
// ===============================
app.get("/image/logo", async (req, res) => {
    try {
        const file = path.join(__dirname, "image", "logo.png");
        const image = await Jimp.read(file);
        const pixels = [];
        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
            pixels.push(this.bitmap.data[idx]);
            pixels.push(this.bitmap.data[idx + 1]);
            pixels.push(this.bitmap.data[idx + 2]);
            pixels.push(this.bitmap.data[idx + 3]);
        });
        res.json({
            width: image.bitmap.width,
            height: image.bitmap.height,
            pixels: pixels
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ===============================
// Upload Image
// ===============================
app.post("/upload", upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No image uploaded" });
        }
        const filePath = path.join(uploadDir, req.file.filename);
        const image = await Jimp.read(filePath);
        res.json({
            message: "Upload success",
            url: "/uploads/" + req.file.filename,
            pixelUrl: "/image/data/" + req.file.filename,
            filename: req.file.filename,
            width: image.bitmap.width,
            height: image.bitmap.height
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ===============================
// Image Pixel API (สำหรับ Roblox EditableImage)
// ===============================
app.get("/image/data/:filename", async (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(uploadDir, filename);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: "Image not found" });
        }
        const image = await Jimp.read(filePath);
        image.resize(512, Jimp.AUTO);
        const pixels = [];
        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
            pixels.push(this.bitmap.data[idx]);
            pixels.push(this.bitmap.data[idx + 1]);
            pixels.push(this.bitmap.data[idx + 2]);
            pixels.push(this.bitmap.data[idx + 3]);
        });
        res.json({
            filename: filename,
            width: image.bitmap.width,
            height: image.bitmap.height,
            pixels: pixels
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ===============================
// Proxy Endpoint (ดึงรูปจาก URL ภายนอก)
// ใช้สำหรับ Roblox ส่ง URL มาขอข้อมูลพิกเซล
// ===============================
app.get("/fetch", async (req, res) => {
    const imageUrl = req.query.url;
    if (!imageUrl) {
        return res.status(400).json({ error: "Missing url parameter" });
    }
    try {
        console.log("📥 Fetching from URL:", imageUrl);
        const response = await axios.get(imageUrl, {
            responseType: "arraybuffer",
            timeout: 10000
        });
        const image = await Jimp.read(response.data);
        image.resize(512, Jimp.AUTO);
        const pixels = [];
        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
            pixels.push(this.bitmap.data[idx]);
            pixels.push(this.bitmap.data[idx + 1]);
            pixels.push(this.bitmap.data[idx + 2]);
            pixels.push(this.bitmap.data[idx + 3]);
        });
        res.json({
            width: image.bitmap.width,
            height: image.bitmap.height,
            pixels: pixels
        });
    } catch (err) {
        console.error("❌ Proxy error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// ===============================
// Start Server
// ===============================
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});