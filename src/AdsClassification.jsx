import React, { useState, useEffect, useRef } from 'react';
import JsonFormatter from 'react-json-formatter'
import axios from 'axios';
import './AdsClassification.css';
import Dropdown from './components/Dropdown/Dropdown.jsx';
import DropdownItem from './components/DropdownItem/DropdownItem.jsx';

import { Link } from 'react-router-dom';


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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [jsonData, setJsonData] = useState(null);

  let oldStateResponse = []  //it will hold the previous response data from /records for comparing the state
  useEffect(() => {
    fetchPastAnalyzedVideos();
    const intervalID = setInterval(fetchPastAnalyzedVideos, 4000); // called every 4 seconds
    return () => clearInterval(intervalID);
  }, []);

  const [open, setOpen] = useState(false) //State varible to toggle the the asset list

  const dropdownRef = useRef()

  useEffect(() => {
    const handler = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target))
        setOpen(false)
    }
    document.addEventListener("click", handler)

    return () => {
      document.removeEventListener("click", handler)
    }
  }, [dropdownRef])

  const toggelDropdonw = () => {
    setOpen((open) => !open);
  }


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
          changedVideoState.push({ _id: newRecord._id, video_path: newRecord.video_path, old: oldRecord.status, new: newRecord.status });
        }
      });

      oldStateResponse = JSON.parse(JSON.stringify(newVideos)) //deep copy new response to compare for next future response for state change notification
      // Pop Status Notification Bar
      changedVideoState?.forEach(video => {
        showStatusMessage({ _id: video._id, video_path: video.video_path, message: `Video ${video.video_path.split('/')[1]} status changed to ${getStatus(video.new)}`, status: video.new });
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
        // const formData = new FormData();
        // formData.append('videoFile', file);

        try {

          // Send a GET request to the server with just the filename
          const response = await axios.get(`${ServerURL}/getUploadSignedUrl?filename=${file.name}`);
          if (response.status === 200) {
            const signedUrl = response.data.signedUrl;

            // Upload the video directly to Cloud Storage using the signed URL
            // const uploadResponse = await fetch(signedUrl, {
            //   method: 'PUT',
            //   body: formData, // Use the original formData for video upload
            // });
            console.log("Generated Signed URL : ", signedUrl)
            const uploadResponse = await axios.put(signedUrl, file, {
              headers: {
                'Content-Type': file.type
              },
              onUploadProgress: (progressEvent) => {
                const percent = Math.round(progressEvent.loaded * 100) / progressEvent.total;
                setProgess(percent);
              }
            });

            if (uploadResponse.status === 200) {
              console.log('Video uploaded successfully!');
              setUploadStatus("Done");
              showStatusMessage({ message: `Video ${file.name} Uploaded and Analyzing ... `, status: 0 });
            } else {
              setUploadStatus("Error uploading video!!");
              console.error('Error uploading video:', uploadResponse.statusText);
              return
            }
          } else {
            console.error('Error fetching signed URL:', response.statusText);
            setUploadStatus("Error Get Signed URL!!");
            return
          }
          // const response = await axios.post(`${ServerURL}/upload`, formData, {
          //   headers: {
          //     'Content-Type': 'multipart/form-data'
          //   },
          //   onUploadProgress: (progressEvent) => {
          //     const percent = Math.round(progressEvent.loaded * 100) / progressEvent.total;
          //     setProgess(percent);
          //   }
          // });
        } catch (error) {
          console.error("!!!Error", error.message);
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
      const asset_id = video_data._id
      const selectedVideoData = pastAnalyzedVideos.find(video => video._id === asset_id && video.video_path === selectedName);
      const video_name = selectedName.split('/')[1];
      setDropDownText(video_name);
      setAnalysisData(selectedVideoData);
      console.log("selectedVideoData:", selectedVideoData);
      try {
        console.log("Get Signed URL for", video_name)
        const response = await axios.get(`${ServerURL}/getSignedUrl/${video_name}`);
        console.log("Video Select Signed Response = ", response);
        if (response.status === 200) {
          console.log("Setting Video URL...");
          setVideoUrl(response.data.signedUrl);
        } else {
          console.log("Not Success Response while generating signed URL", response.status);
          setVideoUrl(null);
        }

        setOpen(false)

      } catch (error) {
        console.log("Error Retrieving Video Signed URL", error.message);
        setVideoUrl(null);
      }
    } catch (error) {
      console.log("!!!Error", error.message);
    }
  };

  const handleViewJson = async () => {
    try {
      let filename = analysisData?.filename
      if (filename === undefined || filename == null) {
        throw new Error("Filename is Null or Undefined")
      }
      setIsModalOpen(true);
      setJsonData({ Loading: "..." });
      const response = await axios.get(`${ServerURL}/getViJsonFile?filename=${filename}`);
      const data = response.data;
      setJsonData(data);

    } catch (error) {
      console.error('Error fetching JSON data:', error);
      setJsonData({ error: "Couldn't get Data Currently" });
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setJsonData(null);
  };

  const handleCopyJson = () => {
    const formattedJson = JSON.stringify(jsonData, null, 4);
  
    // Check if the Clipboard API is available
    if (!navigator.clipboard) {
      alert('Clipboard API not available. Using fallback method.');
      copyUsingFallback(formattedJson);
      return;
    }
  
    navigator.clipboard.writeText(formattedJson)
      .then(() => alert('JSON copied to clipboard!'))
      .catch(err => console.error('Failed to copy JSON', err));
  };
  
  const copyUsingFallback = (text) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        alert('JSON copied to clipboard!');
      } else {
        alert('Failed to copy JSON.');
      }
    } catch (err) {
      console.error('Failed to copy JSON', err);
    } finally {
      document.body.removeChild(textArea);
    }
  };

  const jsonStyle = {
    propertyStyle: { color: '#3B82F6' },  // Keys in blue
    stringStyle: { color: '#10B981' },  // Strings in green
    numberStyle: { color: '#F97316' },  // Numbers in orange
    booleanStyle: { color: '#D97706' }, // Booleans in yellow
    nullStyle: { color: '#DC2626' }     // Null in red
  };
  return (
    <div className="App">
      <header className="header">
        <h1 className="tagline">Ads Classification Tool</h1>
        <Link className="ads-search-tool" to="/ad-search" target="_blank" rel="noopener noreferrer">
          <img src="/hyperlink-icon.png" alt="Hyperlink" className="hyperlink-icon" />
          Ads Search
        </Link>
      </header>
      <div ref={dropdownRef} className={`wholeList ${open ? "wholeList-open" : ''}`}>
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
      </div>
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
        <Dropdown open={open} toggle={toggelDropdonw} buttonText={DropdownText} />
      </div>
      {statusMessage.message && <div className={statusMessage?.status === 1 ? `status_field_green status_field` : `status_field_orange status_field`}>{statusMessage?.message}
        {statusMessage.status === 1 && <span className='link' onClick={() => { handleVideoSelect({ _id: statusMessage._id, video_path: statusMessage.video_path, status: statusMessage.status }) }}>View Results</span>}
        {statusMessage.status === 0 && <span className="loading-spinner"><img style={{ width: '100%' }} src="https://flinenergy.com/flin_css_js_font_images/images/loader.gif" alt="Loading..." /></span>}
        <span className="close-button" onClick={() => setStatusMessage({})}>×</span>
      </div>}
      {(analysisData) && (
        <div className="content">
          <div className="video-container">
            <h3 style={{ margin: '5px', fontSize: '2em' }}>Analyzed Video</h3>
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
                {analysisData && analysisData.hasOwnProperty('start_time') && analysisData.hasOwnProperty('end_time') ? (<> <span className='time_taken'> {((analysisData['end_time'] - analysisData['start_time']).toFixed(2))} Sec</span></>) : (<></>)}
              </h1>
              <>{analysisData ? (<button
                className="view-json-button"
                onClick={handleViewJson}
              >
                View VI JSON
              </button>) : (<></>)

              }
              </>

              {analysisData ? (
                <>
                  <div className="analysis-column">
                    <h3>Logos (Detected Brands) :</h3>
                    {(analysisData.brands_video_gcp && Object.keys(analysisData.brands_video_gcp).length) ? (
                      <ul>
                        {Object.entries(analysisData.brands_video_gcp).sort((a, b) => b[1] - a[1]).map(([brand, confi], index) => (
                          <li key={index}>{brand}<span className='confidence'> - {(confi * 100).toFixed(1) + '%'}</span></li>
                        ))}
                      </ul>
                    ) : (<p>No Results Found</p>)}
                  </div>
                  <div className="analysis-column">
                    <h3>Text (Detected Brands) :</h3>
                    {(analysisData.ocr_text && analysisData.ocr_text.length) ? (<ul>
                      {analysisData.ocr_text.sort((a, b) => b[1] - a[1]).map((item, index) => (
                        <li key={index}>{item["brand"]}<span className='confidence'> - {"confidence" in item ? ((item["confidence"] * 100).toFixed(1) + '%') : ("")}</span></li>
                      ))}
                    </ul>) : (<p>No Results Found</p>)}
                  </div>

                  <div className="analysis-column">
                    <h3>Key Frames Result (Detected Brands) :</h3>
                    {(analysisData.key_frames_text && analysisData.key_frames_text.length) ? (<ul>
                      {analysisData.key_frames_text.sort((a, b) => b[1] - a[1]).map((item, index) => (
                        <li key={index}>{item["brand"]}<span className='confidence'> - {"confidence" in item ? ((item["confidence"] * 100).toFixed(1) + '%') : ("")}</span></li>
                      ))}
                    </ul>) : (<p>No Results Found</p>)}
                  </div>


                  <div className="analysis-column">
                    <h3>LLMs ( Detected Brands) :</h3>
                    {(analysisData.brands_audio.gemini_results && Object.keys(analysisData.brands_audio.gemini_results).length) ? (
                      <ul>
                        {Object.entries(analysisData.brands_audio.gemini_results)
                          .sort((a, b) => b[1] - a[1])  // Sort by confidence (descending)
                          .filter(([brand, confidence]) => confidence > 0.70)  // Filter for confidence above 85%
                          .map(([brand, confidence], index) => (
                            <li key={index}>
                              {brand}<span className='confidence'> - {(confidence * 100).toFixed(1) + '%'}</span>
                            </li>
                          ))}
                        { // Check for no records after filtering
                          !Object.entries(analysisData.brands_audio.gemini_results).filter(
                            ([brand, confidence]) => confidence > 0.85
                          ).length && (
                            <p>No Results Found</p>
                          )
                        }
                      </ul>
                    ) : (<p>No Results Found</p>)}
                  </div>
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


          {isModalOpen && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h2>Video Intelligence JSON Data</h2>
                <div className="json-container">
                <button className="copy-button" onClick={handleCopyJson}>Copy</button>
                <JsonFormatter
                json={jsonData} 
                tabWith={4}
                jsonStyle={jsonStyle} 
                />
                </div>
                <button onClick={handleCloseModal}>Close</button>
              </div>
            </div>
          )}


        </div>
      )}
    </div>
  );
}

export default App;
