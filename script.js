// --- IMPORTANT: Paste your Apps Script Web App URL here ---
const servers = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
let pc = new RTCPeerConnection(servers);

async function startHost() {
  const room = document.getElementById('roomInput').value;
  if (!room) return alert("Please enter a room code!");
  
  const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
  document.getElementById('videoElement').srcObject = stream;
  
  // Show the mobile controls
  document.getElementById('videoControls').style.display = 'flex';

  stream.getTracks().forEach(track => pc.addTrack(track, stream));

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  pc.onicegatheringstatechange = () => {
    if (pc.iceGatheringState === 'complete') {
      fetch(API_URL, { 
        method: 'POST', 
        body: JSON.stringify({ type: 'offer', room: room, offer: JSON.stringify(pc.localDescription) }) 
      });
      checkForAnswer(room);
    }
  };
}

async function joinViewer() {
  const room = document.getElementById('roomInput').value;
  if (!room) return alert("Please enter a room code!");
  
  pc.ontrack = (event) => { 
    document.getElementById('videoElement').srcObject = event.streams[0]; 
    // Show the mobile controls once the video feed connects
    document.getElementById('videoControls').style.display = 'flex';
  };

  const response = await fetch(`${API_URL}?room=${room}`);
  const data = await response.json();

  if (data.offer) {
    await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(data.offer)));
    
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    pc.onicegatheringstatechange = () => {
      if (pc.iceGatheringState === 'complete') {
         fetch(API_URL, { 
           method: 'POST', 
           body: JSON.stringify({ type: 'answer', room: room, answer: JSON.stringify(pc.localDescription) }) 
         });
      }
    };
  } else {
    alert("Room not found. Make sure the host has shared their screen first.");
  }
}

function checkForAnswer(room) {
  const interval = setInterval(async () => {
    const response = await fetch(`${API_URL}?room=${room}`);
    const data = await response.json();
    if (data.answer) {
      await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(data.answer)));
      clearInterval(interval); 
    }
  }, 3000);
}

// --- Mobile Quality of Life Features ---

function toggleFullscreen() {
  const videoObj = document.getElementById('videoElement');
  
  if (!document.fullscreenElement) {
    if (videoObj.requestFullscreen) {
      videoObj.requestFullscreen();
    } else if (videoObj.webkitRequestFullscreen) { /* Safari */
      videoObj.webkitRequestFullscreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) { /* Safari */
      document.webkitExitFullscreen();
    }
  }
}

async function togglePiP() {
  const videoObj = document.getElementById('videoElement');
  
  try {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else if (document.pictureInPictureEnabled) {
      await videoObj.requestPictureInPicture();
    } else {
      alert("Picture-in-Picture is not supported by your current browser.");
    }
  } catch (error) {
    console.error("PiP Error:", error);
  }
}