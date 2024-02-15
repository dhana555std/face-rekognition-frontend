export const sendToApi = async (imageSrc) => {
    try {
        // Create a FormData object
        const formData = new FormData();
        formData.append('file', dataURLtoBlob(imageSrc), 'captured_image.jpg');

        // Make a POST request to the API endpoint
        const response = await fetch('http://localhost:8080/upload', {
            method: 'POST',
            body: formData,
        });
        console.log(response.body);

        if (response.ok) {
            console.log('Image successfully sent to the API');
            const readableStream = response.body;
            // Convert the readable stream to JSON
            const jsonData = await streamToJSON(readableStream);
            console.log(jsonData);
            return await jsonData;
        } else {
            console.error('Failed to send image to the API');
        }
    } catch (error) {
        console.error('Error sending image to the API:', error);
    }
};

const dataURLtoBlob = (dataURL) => {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }

    return new Blob([u8arr], { type: mime });
};


async function streamToJSON(stream) {
    const reader = stream.getReader();
    const chunks = [];

    while (true) {
        const { done, value } = await reader.read();

        if (done) {
            break;
        }

        chunks.push(value);
    }

    // Assuming the chunks are Uint8Arrays, use TextDecoder to convert to a string
    const text = new TextDecoder('utf-8').decode(new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], [])));

    return JSON.parse(text);
}

