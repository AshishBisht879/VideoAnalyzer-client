import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';
import Dropdown from './components/Dropdown/Dropdown.jsx';
import DropdownItem from './components/DropdownItem/DropdownItem.jsx';

const ServerURL = process.env.REACT_APP_SERVER_URL;

function App() {
  const [videoUrl, setVideoUrl] = useState('');
  const inputRef = useRef();
  const [uploadedVideo, setUploadedVideo] = useState(null);
  const [progess, setProgess] = useState(0);
  const [uploadStatus, setUploadStatus] = useState();
  const [analysisData, setAnalysisData] = useState(null);
  const [pastAnalyzedVideos, setPastAnalyzedVideos] = useState([]);
  const [DropdownText, setDropDownText] = useState('Choose Video');
  const [statusMessage, setStatusMessage] = useState({});
  let oldStateResponse = []  //it will hold the previous response data from /records for comparing the state
  useEffect(() => {
    fetchPastAnalyzedVideos();
    const intervalID = setInterval(fetchPastAnalyzedVideos, 4000); // called every 4 seconds
    return () => clearInterval(intervalID);
  }, []);


  function getStatus(status_code) {
    return status_code === 0 ? "Analyzing" : (status_code === 1 ? "Done" : "Unknow")
  }
  const fetchPastAnalyzedVideos = async () => {
    try {

      const response = await axios.get(`${ServerURL}/records`);
      const newVideos = response.data;
      // Find records where status changed 
      const changedVideoState = [];
      oldStateResponse?.forEach(oldRecord => {
        const newRecord = newVideos?.find(record => record._id === oldRecord._id);
        if (newRecord && oldRecord.status !== newRecord.status) {
          changedVideoState.push({ video_path: newRecord.video_path, old: oldRecord.status, new: newRecord.status });
        }
      });

      oldStateResponse = JSON.parse(JSON.stringify(newVideos)) //deep copy new response to compare for next future response for state change notification
      // Pop Status Notification Bar
      changedVideoState?.forEach(video => {
        showStatusMessage({ video_path: video.video_path, message: `Video ${video.video_path.split('/')[1]} status changed to ${getStatus(video.new)}`, status: video.new });
      });

      setPastAnalyzedVideos(newVideos);

    } catch (error) {
      console.error("There was an error fetching the videos!", error);
    }
  };

  const showStatusMessage = (message) => {
    setStatusMessage(message);
    // setTimeout(() => {
    //   setStatusMessage('');
    // }, 9000); // Hide the message after 
  };

  const handleVideoUpload = async (event) => {
    try {
      if (event.target.files && event.target.files.length > 0) {
        const file = event.target.files[0];
        setUploadedVideo(file);
        setAnalysisData(null); // Clear the old analysis result
        setUploadStatus("Uploading");
        setDropDownText('Choose Video');
        const formData = new FormData();
        formData.append("video", file);

        try {
          const response = await axios.post(`${ServerURL}/upload`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            },
            onUploadProgress: (progressEvent) => {
              const percent = Math.round(progressEvent.loaded * 100) / progressEvent.total;
              setProgess(percent);
            }
          });
          console.log("Video Upload Response", response);
          setUploadStatus("Done");
          showStatusMessage({ message: `Video ${file.name} Uploaded and Analyzing ... `, status: 0 });
        } catch (error) {
          console.log("!!!Error", error.message);
          setUploadStatus("Error Uploading");
        }

        setTimeout(() => {
          setUploadedVideo(null); // make the status bar of uploading video disappear after 7 seconds of uploading
        }, 7000);
      }
    } catch (e) {
      console.log(e);
      setUploadStatus("Error");
      setTimeout(() => {
        setUploadedVideo(null);
      }, 7000);
    }
  };

  const handleVideoSelect = async (video_data) => {
    try {
      console.log("handleVideoSelect()", video_data);
      if (!video_data.hasOwnProperty('video_path') || video_data.status !== 1) {
        return;
      }
      const selectedName = video_data.video_path;
      const selectedVideoData = pastAnalyzedVideos.find(video => video.video_path === selectedName);
      const video_name = selectedName.split('/')[1];
      setDropDownText(video_name);
      setAnalysisData(selectedVideoData);
      console.log("selectedVideoData:", selectedVideoData);
      try {
        const response = await axios.get(`${ServerURL}/getSignedUrl/${video_name}`);
        console.log("Video Select Signed Response = ", response);
        if (response.status === 200) {
          console.log("Setting Video URL...");
          setVideoUrl(response.data.signedUrl);
        } else {
          console.log("Not Success Response while generating signed URL", response.status);
          setVideoUrl(null);
        }
      } catch (error) {
        console.log("Error Retrieving Video Signed URL", error.message);
        setVideoUrl(null);
      }
    } catch (error) {
      console.log("!!!Error", error.message);
    }
  };

  return (
    <div className="App">
      <header className="header">
        <h1 className="tagline">Ads Classification Tool</h1>
      </header>
      <div className="control-panel">
        <div className="upload-btn">
          <label htmlFor="videoUpload">Upload Video</label>
          <input id="videoUpload" ref={inputRef} type="file" accept="video/*" onChange={handleVideoUpload} />
        </div>
        {uploadedVideo && (
          <div className='file-info'>
            <div>
              <div>{uploadedVideo.name}</div>
              <div style={{ color: "#FF5833" }}>{uploadStatus}...</div>
              <div className='progress-bar'>
                <div className='progress' style={{ width: `${progess}%` }} />
              </div>
            </div>
          </div>
        )}
        <Dropdown buttonText={DropdownText} content={
          <>
            {pastAnalyzedVideos.map((video, index) => (
              (video.video_path &&
                <DropdownItem key={index} onClick={() => handleVideoSelect(video)}>
                  {`${video.video_path.split('/')[1]}`}
                  <span className={`${video.status === 1 ? 'status status-green' : video.status === 0 ? 'status status-orange' : 'status'}`}>{`${Object.hasOwn(video, 'status') ? (getStatus(video.status)) : "Unknown"}`}</span>
                </DropdownItem>
              )
            ))}
          </>
        } />
      </div>
      {statusMessage.message && <div className={statusMessage?.status === 1 ? `status_field_green status_field` : `status_field_orange status_field`}>{statusMessage?.message}
        {statusMessage.status === 1 && <span className='link' onClick={() => { handleVideoSelect({ video_path: statusMessage.video_path, status: statusMessage.status }) }}>View Results</span>}
        {statusMessage.status === 0 && <span className="loading-spinner"><img style={{width:'100%'}}src="https://flinenergy.com/flin_css_js_font_images/images/loader.gif" alt="Loading..." /></span>}
        <span className="close-button" onClick={() => setStatusMessage({})}>×</span>
      </div>}
      {(analysisData) && (
        <div className="content">
          <div className="video-container">
            <video controls className="video-player" src={videoUrl}>
              <source src={videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
              <div>

                <div>
                  <h3>Brand Composite Confidence Score :</h3>
                  {(analysisData && analysisData.final_brands && Object.keys(analysisData.final_brands).length) ? (
                    <ul>
                      {Object.entries(analysisData.final_brands).sort((a, b) => b[1] - a[1]).map(([brand, confi], index) => (
                        <li key={index}>
                          {brand} - {(confi * 100).toFixed(1)}%
                        </li>
                      ))}
                    </ul>
                  ) : (<p>No Results Found</p>)
                  }
                </div>



                <div className="video_specs">
                <h3>Video Specs : </h3>
                {(analysisData && analysisData?.video_info && (!(analysisData?.video_info.hasOwnProperty('error')))) ? (
                  <ul>
                    <li>Res : {analysisData?.video_info["width"]} x {analysisData?.video_info["height"]} </li>
                    <li>FPS : {analysisData?.video_info["fps"]}</li>
                    <li>Duration : {analysisData?.video_info["duration"]}</li>
                  </ul>
                ) : (<p>No Results Found</p>)
                }
              </div>
                
              </div>
          </div>
          <div className="analysis-container">
            <>
              <h1>Analysis Result : 
                {analysisData && analysisData.hasOwnProperty('start_time') && analysisData.hasOwnProperty('end_time')?(<> (<span className='time_taken'> {((analysisData['end_time']-analysisData['start_time']).toFixed(2))} Sec</span>)</>):(<></>)}
              </h1>
              {analysisData ? (
                <>
                  <div className="analysis-column">
                    <h3>Logos (Detected Brands) :</h3>
                    {(analysisData.brands_video_gcp && Object.keys(analysisData.brands_video_gcp).length) ? (
                      <ul>
                        {Object.entries(analysisData.brands_video_gcp).sort((a, b) => b[1] - a[1]).map(([brand, confi], index) => (
                          <li key={index}>{brand} - {(confi * 100).toFixed(1) + '%'}</li>
                        ))}
                      </ul>
                    ) : (<p>No Results Found</p>)}
                  </div>
                  <div className="analysis-column">
                  <h3>Text (Detected Brands) :</h3>
                    {(analysisData.ocr_text && analysisData.ocr_text.length) ? (<ul>
                      {analysisData.ocr_text.sort((a, b) => b[1] - a[1]).map((item, index) => (
                        <li key={index}>{item["brand"]} - {"confidence" in item?((item["confidence"] * 100).toFixed(1) + '%'):("")}</li>
                      ))}
                    </ul>) : (<p>No Results Found</p>)}
                  </div>
                  <div className="analysis-column">
                    <h3>LLMs ( Detected Brands) :</h3>
                    {(analysisData.brands_audio.gemini_results && Object.keys(analysisData.brands_audio.gemini_results).length) ? (<ul>
                      {Object.entries(analysisData.brands_audio.gemini_results).sort((a, b) => b[1] - a[1]).map(([brand, confidence], index) => (
                        <li key={index}>{brand} - {(confidence * 100).toFixed(1) + '%'}</li>
                      ))}
                    </ul>) : (<p>No Results Found</p>)}
                  </div>
                  {/* <div className="analysis-column">
                    <h3>Entities Detection (Detected Brands) :</h3>
                    {(analysisData.brands_audio.comprehend_results && Object.keys(analysisData.brands_audio.comprehend_results).length) ? (<ul>
                      {Object.entries(analysisData.brands_audio.comprehend_results).sort((a, b) => b[1] - a[1]).map(([brand, confidence], index) => (
                        <li key={index}>{brand} - {(confidence * 100).toFixed(1) + '%'}</li>
                      ))}
                    </ul>) : (<p>No Results Found</p>)}
                  </div> */}
                  <div className="analysis-column">
                    <h3>Category (IAB) :</h3>
                    {(analysisData.final_categories && Object.keys(analysisData.final_categories).length) ? (<ul>
                      {analysisData.final_categories.map((brand, index) => (
                        <li key={index}>{brand}</li>
                      ))}
                    </ul>) : (<p>No Results Found</p>)}
                  </div>
                </>
              ) : (<p>No Results Found</p>)}
            </>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
