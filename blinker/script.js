document.addEventListener('DOMContentLoaded', () => {
    const plots = document.querySelectorAll('.plot');
    let timers = {};
    let treeStates = {};
    let totalBlinkers = 0;
    let pruneTime = 10; // Default prune time in minutes
  
    // Load saved states from storage
    chrome.storage.local.get(['treeStates', 'totalBlinkers', 'pruneTime'], (result) => {
      if (result.treeStates) {
        treeStates = result.treeStates;
      }
      if (result.totalBlinkers !== undefined) {
        totalBlinkers = result.totalBlinkers;
      }
      if (result.pruneTime !== undefined) {
        pruneTime = result.pruneTime;
      }
      updatePlots();
      updateTotalBlinkers();
      startPruneInterval();
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
        if (!treeStates[index] || treeStates[index].dead) {
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
          treeStates[index] = { planted: true, dead: false, plantedTime: Date.now() };
          totalBlinkers++;
          chrome.storage.local.set({ treeStates: treeStates, totalBlinkers: totalBlinkers }, () => {
            console.log('Tree planted!');
          });
          timerElement.textContent = 'Planted!';
          timerElement.style.fontSize = '16px'; // Set consistent font size
          timerElement.classList.remove('countdown'); // Remove countdown class
          updateTotalBlinkers();
          startPruneTimer(index);
        }
      }, 100);
    }
  
    function startPruneInterval() {
      setInterval(() => {
        plots.forEach((plot, index) => {
          const state = treeStates[index];
          if (state && state.planted && !state.dead) {
            const timeSincePlanted = (Date.now() - state.plantedTime) / 60000; // Convert to minutes
            if (timeSincePlanted >= 90) { // Hardcoded to die after 1.5 hours
              treeStates[index].dead = true;
              chrome.storage.local.set({ treeStates: treeStates }, () => {
                console.log('Tree died after 1.5 hours!');
              });
              plot.classList.remove('active');
              const timerElement = plot.querySelector('.timer');
              if (timerElement) {
                plot.removeChild(timerElement);
              }
            } else if (Math.random() < 0.5 && timeSincePlanted >= pruneTime / 2) { // 50% chance to decay every 30 minutes
              treeStates[index].dead = true;
              chrome.storage.local.set({ treeStates: treeStates }, () => {
                console.log('Tree pruned!');
              });
              plot.classList.remove('active');
              const timerElement = plot.querySelector('.timer');
              if (timerElement) {
                plot.removeChild(timerElement);
              }
            }
          }
        });
      }, 60000); // Check every minute
    }
  
    function startPruneTimer(index) {
      setTimeout(() => {
        const state = treeStates[index];
        if (state && state.planted && !state.dead) {
          treeStates[index].dead = true;
          chrome.storage.local.set({ treeStates: treeStates }, () => {
            console.log('Tree died after 1.5 hours!');
          });
          plots[index].classList.remove('active');
          const timerElement = plots[index].querySelector('.timer');
          if (timerElement) {
            plots[index].removeChild(timerElement);
          }
        }
      }, 90 * 60000); // 1.5 hours
    }
  
    const resetButton = document.getElementById('reset-button');
    resetButton.addEventListener('click', () => {
      treeStates = {};
      chrome.storage.local.set({ treeStates: treeStates }, () => {
        console.log('Trees reset!');
      });
      updatePlots();
    });
  
    const settingsIcon = document.getElementById('settings-icon');
    const settingsModal = document.getElementById('settings-modal');
    const saveSettingsButton = document.getElementById('save-settings');
  
    settingsIcon.addEventListener('click', () => {
      settingsModal.style.display = 'flex';
    });
  
    saveSettingsButton.addEventListener('click', () => {
      const newPruneTime = parseInt(document.getElementById('prune-time').value, 10);
      if (newPruneTime >= 1 && newPruneTime <= 60) {
        pruneTime = newPruneTime;
        chrome.storage.local.set({ pruneTime: pruneTime }, () => {
          console.log(`Prune time set to ${pruneTime} minutes`);
        });
        settingsModal.style.display = 'none';
      } else {
        alert('Please enter a valid prune time between 1 and 60 minutes.');
      }
    });
  });