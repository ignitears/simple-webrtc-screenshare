const servers = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
let pc = new RTCPeerConnection(servers);

let isHost = false;
let activeRoom = "";

async function startHost() {
  activeRoom = Math.random().toString(36).substring(2, 8).toUpperCase();
  isHost = true;
  const roomInput = document.getElementById('roomInput');
  roomInput.value = activeRoom;
  roomInput.readOnly = true; // Locks the code so the host cannot edit it
  
  const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
  document.getElementById('videoElement').srcObject = stream;
  document.getElementById('videoControls').style.display = 'flex';

  stream.getTracks().forEach(track => pc.addTrack(track, stream));

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  pc.onicegatheringstatechange = () => {
    if (pc.iceGatheringState === 'complete') {
      fetch(API_URL, { 
        method: 'POST', 
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ room: activeRoom, offer: JSON.stringify(pc.localDescription) }) 
      }).catch(err => console.error(err));
      checkForAnswer(activeRoom);
    }
  };
}

async function joinViewer() {
  activeRoom = document.getElementById('roomInput').value;
  if (!activeRoom) return alert("Please enter a room code!");
  
  pc.ontrack = (event) => { 
    const video = document.getElementById('videoElement');
    video.srcObject = event.streams[0]; 
    video.play().catch(e => console.log("Play blocked by browser")); // Forces video to play
    document.getElementById('videoControls').style.display = 'flex';
  };

  const response = await fetch(`${API_URL}?room=${activeRoom}`);
  const data = await response.json();

  if (data.offer) {
    await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(data.offer)));
    
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    pc.onicegatheringstatechange = () => {
      if (pc.iceGatheringState === 'complete') {
         fetch(API_URL, { 
           method: 'POST', 
           headers: { "Content-Type": "text/plain;charset=utf-8" },
           body: JSON.stringify({ room: activeRoom, answer: JSON.stringify(pc.localDescription) }) 
         }).catch(err => console.error(err));
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
    } else if (videoObj.webkitRequestFullscreen) { 
      videoObj.webkitRequestFullscreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) { 
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

// --- Cleanup System ---
window.onbeforeunload = () => {
  if (isHost && activeRoom) {
    fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'clear', room: activeRoom })
    });
  }
};