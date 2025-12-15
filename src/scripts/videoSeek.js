// Content script to seek video backward/forward
(function (seekAmount) {
    'use strict';

    // Find the main video element on the page
    function findVideo() {
        const videos = document.querySelectorAll('video');

        if (videos.length === 0) {
            return null;
        }

        let targetVideo = videos[0];

        // If multiple videos, prefer the one that's visible and largest
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

        return targetVideo;
    }

    // Seek the video
    const video = findVideo();
    if (video) {
        video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seekAmount));
    }
})
