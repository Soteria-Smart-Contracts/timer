document.addEventListener('DOMContentLoaded', () => {
    const plots = document.querySelectorAll('.plot');
    let timers = {};
    let treeStates = {};
    let totalBlinkers = 0;
    let isBlinking = false; // Flag to ensure only one blinker at a time
  
    // Load saved states from storage
    chrome.storage.local.get(['treeStates', 'totalBlinkers'], (result) => {
      if (result.treeStates) {
        treeStates = result.treeStates;
      }
      if (result.totalBlinkers !== undefined) {
        totalBlinkers = result.totalBlinkers;
      }
      updatePlots();
      updateTotalBlinkers();
    });
  
    function updatePlots() {
      plots.forEach((plot, index) => {
        const state = treeStates[index];
        if (state && state.planted && !state.dead) {
          plot.classList.add('active');
          const timerElement = plot.querySelector('.timer');
          if (!timerElement) {
            const newTimer = document.createElement('div');
            newTimer.className = 'timer';
            plot.appendChild(newTimer);
          }
          plot.querySelector('.timer').textContent = 'Planted!';
          plot.querySelector('.timer').style.fontSize = '16px'; // Set consistent font size
          plot.querySelector('.timer').classList.remove('countdown'); // Remove countdown class
        } else {
          plot.classList.remove('active');
          const timerElement = plot.querySelector('.timer');
          if (timerElement) {
            plot.removeChild(timerElement);
          }
        }
      });
    }
  
    function updateTotalBlinkers() {
      document.getElementById('blink-count').textContent = totalBlinkers;
    }
  
    plots.forEach((plot, index) => {
      plot.addEventListener('click', () => {
        if (!isBlinking && (!treeStates[index] || treeStates[index].dead)) {
          isBlinking = true;
          startTimer(plot, index);
        }
      });
    });
  
    function startTimer(plot, index) {
      let startTime = Date.now();
      let interval = setInterval(() => {
        let elapsed = (Date.now() - startTime) / 1000;
        let timerElement = plot.querySelector('.timer');
        if (!timerElement) {
          timerElement = document.createElement('div');
          timerElement.className = 'timer countdown'; // Add countdown class
          plot.appendChild(timerElement);
        }
        timerElement.style.fontSize = `${24 + (elapsed * 2)}px`; // Growing font size during timer
        timerElement.style.color = `rgba(255, ${255 - (elapsed * 32)}, 0, 1)`;
        timerElement.textContent = `${8 - Math.floor(elapsed)}s`;
  
        if (elapsed >= 8) {
          clearInterval(interval);
          plot.classList.add('active');
          treeStates[index] = { planted: true, dead: false };
          totalBlinkers++;
          chrome.storage.local.set({ treeStates: treeStates, totalBlinkers: totalBlinkers }, () => {
            console.log('Tree planted!');
          });
          timerElement.textContent = 'Planted!';
          timerElement.style.fontSize = '16px'; // Set consistent font size
          timerElement.classList.remove('countdown'); // Remove countdown class
          updateTotalBlinkers();
          isBlinking = false; // Allow another blink
          setTimeout(() => {
            treeStates[index].dead = true;
            chrome.storage.local.set({ treeStates: treeStates }, () => {
              console.log('Tree died!');
            });
            plot.classList.remove('active');
            plot.removeChild(timerElement);
          }, 120000); // 2 min
        }
      }, 100);
    }
  
    const resetButton = document.getElementById('reset-button');
    resetButton.addEventListener('click', () => {
      treeStates = {};
      chrome.storage.local.set({ treeStates: treeStates }, () => {
        console.log('Trees reset!');
      });
      updatePlots();
    });
  });