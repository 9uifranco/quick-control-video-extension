// Content script to toggle video play/pause
(function () {
    'use strict';

    // Find the main video element on the page
    function findVideo() {
        // Try to find the video element
        // Priority: visible videos, then any video
        const videos = document.querySelectorAll('video');

        if (videos.length === 0) {
            console.log('No video element found on this page');
            return null;
        }

        // For YouTube and most sites, use the first video
        // This handles regular YouTube, YouTube Shorts, and most video sites
        let targetVideo = videos[0];

        // If multiple videos, prefer the one that's visible and largest
        if (videos.length > 1) {
            const visibleVideos = Array.from(videos).filter(v => {
                const rect = v.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0;
            });

            if (visibleVideos.length > 0) {
                // Use the largest visible video
                targetVideo = visibleVideos.reduce((largest, current) => {
                    const largestSize = largest.offsetWidth * largest.offsetHeight;
                    const currentSize = current.offsetWidth * current.offsetHeight;
                    return currentSize > largestSize ? current : largest;
                });
            }
        }

        return targetVideo;
    }

    // Toggle play/pause on the video
    function toggleVideo() {
        const video = findVideo();

        if (!video) {
            return;
        }

        if (video.paused) {
            video.play().catch(err => {
                console.error('Failed to play video:', err);
            });
        } else {
            video.pause();
        }
    }

    // Execute the toggle
    toggleVideo();
})();
