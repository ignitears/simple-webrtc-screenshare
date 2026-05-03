const servers = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
let pc = new RTCPeerConnection(servers);

let isHost = false;
let activeRoom = "";

// Auto-detect if someone scanned the QR code on their phone
window.onload = () => {
  const params = new URLSearchParams(window.location.search);
  const castRoom = params.get('cast');
  if (castRoom) {
    const roomInput = document.getElementById('roomInput');
    roomInput.value = castRoom;
    roomInput.readOnly = true;

    // Hide other buttons so the user doesn't get confused
    document.getElementById('viewBtn').style.display = 'none';
    document.getElementById('castBtn').style.display = 'none';

    // Turn the Host button into a clear "Start Casting" button
    const hostBtn = document.getElementById('hostBtn');
    hostBtn.innerText = "Tap Here to Cast Screen";
    
    showNotice("Ready! Tap the button to cast to the computer.");
  }
};

// Helper for Custom Popups
function showNotice(msg) {
  const container = document.getElementById('notification-container');
  const toast = document.createElement('div');
  toast.className = 'popup';
  toast.innerText = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// Connection Sensor
pc.oniceconnectionstatechange = () => {
  const videoControls = document.getElementById('videoControls');
  
  if (pc.iceConnectionState === 'connected') {
    showNotice("Connection Successful!");
    videoControls.style.display = 'flex'; 
  }
  
  if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
    document.getElementById('videoElement').srcObject = null;
    videoControls.style.display = 'none';
    showNotice("Connection Lost.");
    
    // Safely refresh the page to bring buttons back and clear memory
    setTimeout(() => location.reload(), 2000);
  }
};

async function startHost() {
  const actionButtons = document.getElementById('actionButtons');
  const roomInput = document.getElementById('roomInput');
  
  try {
    // Ask for screen permissions (This is now safely triggered by a physical tap!)
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    
    // If the QR code filled the box, use that code. Otherwise, generate a new one.
    activeRoom = roomInput.value.trim();
    if (!activeRoom) {
      activeRoom = Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    
    isHost = true;
    roomInput.value = activeRoom;
    roomInput.readOnly = true; 
    actionButtons.style.display = 'none'; 
    roomInput.style.marginBottom = '1rem'; 
    document.querySelector('.video-wrapper').style.marginTop = '1rem'; 
    
    document.getElementById('videoElement').srcObject = stream;
    document.getElementById('videoControls').style.display = 'flex';

    stream.getVideoTracks()[0].onended = () => {
      fetch(API_URL, { 
        method: 'POST', 
        keepalive: true,
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: 'clear', room: activeRoom }) 
      });
      showNotice("You stopped sharing.");
      
      // Safely reset the phone back to the normal homepage, removing the QR code link
      setTimeout(() => window.location.href = window.location.href.split('?')[0], 1500); 
    };

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
  } catch (err) {
    showNotice("Screen sharing cancelled.");
  }
}

async function joinViewer() {
  activeRoom = document.getElementById('roomInput').value;
  if (!activeRoom) return showNotice("Please enter a room code!");
  
  const viewBtn = document.getElementById('viewBtn');
  const actionButtons = document.getElementById('actionButtons');

  // Anti-Spam Lock
  viewBtn.disabled = true;
  viewBtn.innerText = "Connecting...";

  pc.ontrack = (event) => { 
    const video = document.getElementById('videoElement');
    video.srcObject = event.streams[0]; 
    video.play().catch(e => console.log("Play blocked")); 
  };

  try {
    const response = await fetch(`${API_URL}?room=${activeRoom}`);
    const data = await response.json();

    if (data.offer) {
      // Room found! Hide the buttons and proceed
      actionButtons.style.display = 'none';
      roomInput.style.marginBottom = '1rem'; // Shrinks the gap below the input
      document.querySelector('.video-wrapper').style.marginTop = '1rem'; // Shrinks the gap above the video

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
      // Room not found, unlock the button so they can try again
      showNotice("Room not found. Check the code.");
      viewBtn.disabled = false;
      viewBtn.innerText = "View Screen (Viewer)";
    }
  } catch (err) {
    showNotice("Network error. Try again.");
    viewBtn.disabled = false;
    viewBtn.innerText = "View Screen (Viewer)";
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
    if (videoObj.requestFullscreen) videoObj.requestFullscreen();
    else if (videoObj.webkitRequestFullscreen) videoObj.webkitRequestFullscreen();
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  }
}

async function togglePiP() {
  const videoObj = document.getElementById('videoElement');
  try {
    if (document.pictureInPictureElement) await document.exitPictureInPicture();
    else if (document.pictureInPictureEnabled) await videoObj.requestPictureInPicture();
    else showNotice("Picture-in-Picture is not supported.");
  } catch (error) { console.error("PiP Error:", error); }
}

// --- Cleanup System ---
window.onbeforeunload = () => {
  if (isHost && activeRoom) {
    fetch(API_URL, {
      method: 'POST',
      keepalive: true,
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: 'clear', room: activeRoom })
    });
  }
};

function prepareToReceive() {
  const actionButtons = document.getElementById('actionButtons');
  const roomInput = document.getElementById('roomInput');
  
  // 1. Generate code and hide UI
  activeRoom = Math.random().toString(36).substring(2, 8).toUpperCase();
  roomInput.value = activeRoom;
  roomInput.readOnly = true;
  actionButtons.style.display = 'none';

  // 2. Generate the exact URL for the phone to scan
  const currentUrl = window.location.href.split('?')[0]; 
  const castUrl = `${currentUrl}?cast=${activeRoom}`;

  // 3. Draw the QR Code on the screen
  const qrContainer = document.getElementById('qrcode');
  qrContainer.style.display = 'block';
  new QRCode(qrContainer, { text: castUrl, width: 220, height: 220 });

  showNotice("Scan QR code with your phone!");

  // 4. Poll the database waiting for the phone to send the video feed
  const interval = setInterval(async () => {
    const response = await fetch(`${API_URL}?room=${activeRoom}`);
    const data = await response.json();
    
    if (data.offer) {
      clearInterval(interval); // Stop searching, we found the phone!
      qrContainer.style.display = 'none'; 
      showNotice("Phone connected! Loading video...");

      // Prepare the video player
      pc.ontrack = (event) => { 
        const video = document.getElementById('videoElement');
        video.srcObject = event.streams[0]; 
        video.play().catch(e => console.log("Play blocked")); 
        document.getElementById('videoControls').style.display = 'flex';
      };

      // Connect the WebRTC Handshake
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
    }
  }, 3000);
}