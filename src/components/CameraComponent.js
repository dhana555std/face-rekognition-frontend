import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import { sendToApi } from '../service';

const CameraComponent = () => {
  const webcamRef = useRef(null);
  const [warning, setWarning] = useState('');
  const [nameOfDetectedPerson, setNameOfDetectedPerson] = useState('');
  const [capturedImage, setCapturedImage] = useState('');
  const [animationKey, setAnimationKey] = useState(0);
  // const [animationKey1, setAnimationKey1] = useState(0);

  const videoConstraints = {
    width: "100%",
    height: "100%",
    facingMode: 'user',
  };
  const cropImage = (sourceImage, startX, startY, width, height) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(sourceImage, startX, startY, width, height, 0, 0, width, height);
   // const croppedImage = new Image();//added
   // croppedImage.src = canvas.toDataURL();//added

    return canvas.toDataURL();
  };

  const speakText = (text) => {
    let announcement = text.trim() ? text : 'Illegal access';

    if ('speechSynthesis' in window) {
      const speech = new SpeechSynthesisUtterance(announcement);
      window.speechSynthesis.speak(speech);
    } else {
      alert('Speech synthesis is not supported in your browser. Please use a different browser.');
    }
  };

  const captureImage = useCallback(async () => {
    if (webcamRef.current) {
      const video = webcamRef.current.video;
      const displaySize = {
        width: video.offsetWidth,
        height: video.offsetHeight,
      };

      // Detect faces in the camera feed
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();
      
      // Create a canvas to draw on
     const canvas = faceapi.createCanvasFromMedia(video);
      const context = canvas.getContext('2d');

      // Resize the detections to match the display size
      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      console.log(resizedDetections.length);
      // Clear the canvas and apply transformations
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.translate(canvas.width, 0);
        context.scale(-1, 1);

      resizedDetections.forEach((detection) => {
        faceapi.draw.drawDetections(context, [detection]);

        const box = detection.detection.box;
        const text = nameOfDetectedPerson;

        context.fillStyle = 'red';
        context.font = '16px Arial';
        context.fillText(text, box.x + 5, box.y - 5);
      });

      // Append the canvas to the document
      //document.body.appendChild(canvas);

      // Get a screenshot from the webcam and set it as the captured image
      const imageSrc = webcamRef.current.getScreenshot();
      setCapturedImage(imageSrc);
      setAnimationKey((prevKey) => prevKey + 1);
      // setAnimationKey1((prevKey) => prevKey + 1);
      // Create an image element from the screenshot
      const img = new Image();
      img.src = imageSrc;

      // Process the captured image
      img.onload = async () => {
        // Detect faces in the captured image
        const imgDetections = await faceapi
          .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptors();

        if (imgDetections.length == 1) {
          // Use the first detected face
          
          const detection = imgDetections[0];
          setWarning('');

          const box = detection.detection.box;
          const croppedImage = await cropImage(
            img,
            detection.alignedRect._box._x,
            detection.alignedRect._box._y,
            detection.alignedRect._box._width,
            detection.alignedRect._box._height
          );

          // Send the cropped image to the REST API
          const data = await sendToApi(croppedImage);
          console.log(data);  
          if (data && Array.isArray(data) && data.length > 0 && data[0].Face) {
            const name = data[0]?.Face.ExternalImageId.split('.')[0];
            setNameOfDetectedPerson(name);
            speakText(`Hello, ${name}`);
          } else if (data.statusCode !=undefined && data.statusCode == 401) {
            setNameOfDetectedPerson("unAuthorized");
            speakText(`Illegal access`);
          } else {
            // setNameOfDetectedPerson("unAuthorized");
            // speakText(`Welcome`);
          }
        } else if (resizedDetections.length > 1) {
          // Display warning if more than one face is detected
          setCapturedImage('');
          setWarning('Multiple persons detected! Please make sure only one person is in the frame.');
        } else {
          // No face detected in the captured image
          setCapturedImage('');
          setWarning('No face detected in the captured image!');
        }
      };
    }
  }, [webcamRef, setCapturedImage, setNameOfDetectedPerson, setWarning]);

  useEffect(() => {
    const loadModels = async () => {
      await faceapi.nets.tinyFaceDetector.loadFromUri('./models');
      await faceapi.nets.faceLandmark68Net.loadFromUri('./models');
      await faceapi.nets.faceRecognitionNet.loadFromUri('./models');
    };

    loadModels();

    const captureInterval = setInterval(() => {captureImage();
    }, 3000);

    return () => clearInterval(captureInterval);
  }, [captureImage]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      {warning && (
        <div style={{ color: 'red', fontSize: '18px', margin: '10px' }}>{warning}</div>
      )}
      <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', backgroundColor: 'Gray' }}>
        <Webcam
          audio={false}
          ref={webcamRef}
          mirrored={true}
          screenshotFormat="image/jpeg"
          style={{ width: '100%', height: '100%' }}
          videoConstraints={videoConstraints}
        />
        {capturedImage && (
          <div
            key={animationKey}
            className="bounce-top"
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '100%',  
              maxWidth: '150px',
              height: 'auto',   
              textAlign: 'center',
              padding: '10px',
              backgroundColor: 'Thistle',
              borderRadius: '5px',
              boxShadow: '0 0 10px rgba(0, 0, 0, 0.2)',
              margin: '10px',
            }}
          >
            {nameOfDetectedPerson !== 'unAuthorized' && (
              <div key={animationKey}
              className="scale-in-center" 
              style={{ position: 'absolute', top: '5px', left: '10px', color: 'green', fontSize: '40px' }}>
                ✅
              </div>
            )}
            {nameOfDetectedPerson === 'unAuthorized' && (
              <div key={animationKey}
              className="scale-in-center" 
              style={{ position: 'absolute', top: '5px', left: '10px', color: 'red', fontSize: '40px' }}>
                ❌
              </div>
            )}
  
            <img
              src={capturedImage}
              alt="Captured"
              style={{
                width: '75%',
                height: '75%',
                borderRadius: '5px',
              }}
            />
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'Black', marginTop: '10px' }}>
              {nameOfDetectedPerson !== 'unAuthorized' ? (
                <>
                  {nameOfDetectedPerson}
                 
                </>
              ) : (
                <span className="cancel-mark"></span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
  
  
};

export default CameraComponent;

