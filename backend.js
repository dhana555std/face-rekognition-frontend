import express from 'express';
import multer from 'multer';
import bodyParser from 'body-parser';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { searchFaces } from "./compareLocalFacesWithCollection.js";

const app = express();
const port = 3000;

app.use(bodyParser.raw());
const storage = multer.memoryStorage();
const files = multer({ storage });

app.post('/upload', files.single('file'), async (req, res) => {
    try {
        const startingTime = new Date();
        const image = req.file;

        if (!image) {
            return res.status(400).send('No image uploaded');
        }

        const fileExtension = path.extname(image.originalname).toLowerCase();

        if (!process.env.VALID_IMAGE_EXTENSIONS.includes(fileExtension)) {
            return res.status(415).send('File type not supportd, .png/.PNG/.jpg/.JPG/.jpeg/.JPEG expected');
        }

        const filePath = await saveFileInTemp(image, fileExtension);
        const facerekognitionResponse = await searchFaces(filePath);

        const endingTime = new Date();
        const secondsDifference = ((endingTime.getTime()
            - startingTime.getTime()) / 1000);
        console.log(`Time difference: ${secondsDifference} seconds`);

        res.status(200).send(facerekognitionResponse);

    } catch (error) {
        console.error(error);
        res.status(500).send('Internal server error');
    }
});

async function saveFileInTemp(image, fileExtension) {
    const imageBuffer = image.buffer;
    const tempDirectory = os.tmpdir();
    const filename = 'image-' + Date.now() + fileExtension;
    const filePath = path.join(tempDirectory, filename);
    await fs.writeFileSync(filePath, imageBuffer);
    console.log(`File saved at location ${filePath}`);
    return filePath;
}


app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});