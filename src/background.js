// Background service worker for the video toggle extension
// Store the last paused tab IDs
let lastPausedTabs = [];

chrome.commands.onCommand.addListener(async (command) => {
    if (command === "play-pause") {
        // Get all tabs
        const allTabs = await chrome.tabs.query({});

        // Check each tab for playing videos
        const tabsWithPlayingVideos = [];

        for (const tab of allTabs) {
            try {
                // Inject script to check if video is playing
                const results = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => {
                        const videos = document.querySelectorAll('video');
                        for (const video of videos) {
                            if (!video.paused) {
                                return true; // Found a playing video
                            }
                        }
                        return false;
                    }
                });

                if (results && results[0] && results[0].result === true) {
                    tabsWithPlayingVideos.push(tab);
                }
            } catch (err) {
                // Tab might not be accessible (e.g., chrome:// pages)
                continue;
            }
        }

        // If we found tabs with playing videos, pause them and remember them
        if (tabsWithPlayingVideos.length > 0) {
            lastPausedTabs = tabsWithPlayingVideos.map(t => t.id);
            for (const tab of tabsWithPlayingVideos) {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ["scripts/videoToggle.js"]
                });
            }
        } else if (lastPausedTabs.length > 0) {
            // No playing videos, but we have previously paused tabs - resume them
            for (const tabId of lastPausedTabs) {
                try {
                    chrome.scripting.executeScript({
                        target: { tabId: tabId },
                        files: ["scripts/videoToggle.js"]
                    });
                } catch (err) {
                    // Tab might have been closed
                    continue;
                }
            }
            lastPausedTabs = [];
        } else {
            // No playing videos and no memory, try the active tab
            const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (activeTabs[0]) {
                chrome.scripting.executeScript({
                    target: { tabId: activeTabs[0].id },
                    files: ["scripts/videoToggle.js"]
                });
            }
        }
    } else if (command === "seek-forward" || command === "seek-backward") {
        // Seek forward or backward on all tabs with videos
        const seekAmount = command === "seek-forward" ? 5 : -5;
        const allTabs = await chrome.tabs.query({});

        for (const tab of allTabs) {
            try {
                // Check if tab has videos
                const hasVideo = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => {
                        return document.querySelectorAll('video').length > 0;
                    }
                });

                if (hasVideo && hasVideo[0] && hasVideo[0].result === true) {
                    // Seek on this tab
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: (seekAmount) => {
                            const videos = document.querySelectorAll('video');
                            if (videos.length > 0) {
                                let targetVideo = videos[0];
                                if (videos.length > 1) {
                                    const visibleVideos = Array.from(videos).filter(v => {
                                        const rect = v.getBoundingClientRect();
                                        return rect.width > 0 && rect.height > 0;
                                    });
                                    if (visibleVideos.length > 0) {
                                        targetVideo = visibleVideos.reduce((largest, current) => {
                                            const largestSize = largest.offsetWidth * largest.offsetHeight;
                                            const currentSize = current.offsetWidth * current.offsetHeight;
                                            return currentSize > largestSize ? current : largest;
                                        });
                                    }
                                }
                                targetVideo.currentTime = Math.max(0, Math.min(targetVideo.duration, targetVideo.currentTime + seekAmount));
                            }
                        },
                        args: [seekAmount]
                    });
                }
            } catch (err) {
                // Tab might not be accessible (e.g., chrome:// pages)
                continue;
            }
        }
    }
});
