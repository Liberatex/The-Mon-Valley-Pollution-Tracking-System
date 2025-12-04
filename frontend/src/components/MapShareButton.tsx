/**
 * MapShareButton - Share button with popup menu for sharing the map
 * Supports: X/Twitter, Facebook, Instagram, Email, Embed
 */

import React, { useState, useRef, useEffect } from 'react';
import { Share2, X, Facebook, Instagram, Mail, Code } from 'lucide-react';

interface MapShareButtonProps {
  mapUrl?: string;
  mapTitle?: string;
  mapDescription?: string;
}

const MapShareButton: React.FC<MapShareButtonProps> = ({
  mapUrl = typeof window !== 'undefined' ? window.location.href : '',
  mapTitle = 'Mon Valley Pollution Tracking System - Interactive Air Quality Map',
  mapDescription = 'Real-time air quality monitoring and pollution tracking for the Mon Valley region. View PurpleAir sensors, Title V facilities, risk zones, and more.',
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showMenu]);

  const encodedUrl = encodeURIComponent(mapUrl);
  const encodedTitle = encodeURIComponent(mapTitle);
  const encodedDescription = encodeURIComponent(mapDescription);

  // Social media sharing URLs
  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    instagram: `https://www.instagram.com/`, // Instagram doesn't support direct URL sharing, will copy link instead
    email: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%0A%0A${mapUrl}`,
  };

  const handleShare = (platform: 'twitter' | 'facebook' | 'instagram' | 'email' | 'embed') => {
    if (platform === 'instagram') {
      // Instagram doesn't support direct URL sharing, so copy link to clipboard
      navigator.clipboard.writeText(mapUrl).then(() => {
        // Show a subtle notification (you can replace with a toast library if preferred)
        const notification = document.createElement('div');
        notification.textContent = 'Link copied! Paste it into your Instagram post.';
        notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #22c55e; color: white; padding: 12px 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10000; font-size: 14px; font-weight: 500;';
        document.body.appendChild(notification);
        setTimeout(() => {
          notification.style.opacity = '0';
          notification.style.transition = 'opacity 0.3s';
          setTimeout(() => notification.remove(), 300);
        }, 3000);
        setShowMenu(false);
      }).catch(() => {
        alert('Failed to copy link. Please copy manually: ' + mapUrl);
      });
      return;
    }

    if (platform === 'embed') {
      // Copy embed code to clipboard
      const embedCode = `<iframe src="${mapUrl}" width="100%" height="600" frameborder="0" allowfullscreen></iframe>`;
      navigator.clipboard.writeText(embedCode).then(() => {
        // Show a subtle notification
        const notification = document.createElement('div');
        notification.textContent = 'Embed code copied to clipboard!';
        notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #22c55e; color: white; padding: 12px 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10000; font-size: 14px; font-weight: 500;';
        document.body.appendChild(notification);
        setTimeout(() => {
          notification.style.opacity = '0';
          notification.style.transition = 'opacity 0.3s';
          setTimeout(() => notification.remove(), 300);
        }, 3000);
        setShowMenu(false);
      }).catch(() => {
        alert('Failed to copy embed code. Please copy manually:\n\n' + embedCode);
      });
      return;
    }

    // Open sharing window
    const shareUrl = shareLinks[platform];
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400,scrollbars=yes,resizable=yes');
      setShowMenu(false);
    }
  };

  // Web Share API (for mobile devices)
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: mapTitle,
          text: mapDescription,
          url: mapUrl,
        });
        setShowMenu(false);
      } catch (err) {
        // User cancelled or error occurred
        console.log('Share cancelled or failed');
      }
    } else {
      // Fallback: show menu
      setShowMenu(true);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => {
          // Try native share on mobile, otherwise show menu
          if (navigator.share && window.innerWidth < 640) {
            handleNativeShare();
          } else {
            setShowMenu(!showMenu);
          }
        }}
        className="flex items-center gap-1.5 sm:gap-2 px-2 py-1.5 sm:px-3 sm:py-2 rounded-md hover:bg-white/20 transition-colors text-xs sm:text-sm text-white bg-black/40 backdrop-blur-md border border-white/20 shadow-sm"
        aria-label="Share map"
        aria-expanded={showMenu}
      >
        <Share2 className="w-3 h-3 sm:w-4 sm:h-4" />
        <span className="hidden sm:inline font-medium">Share</span>
      </button>

      {/* Share Menu Popup */}
      {showMenu && (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[220px] z-[2000]">
          {/* Twitter/X */}
          <button
            onClick={() => handleShare('twitter')}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left group"
          >
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <X className="w-5 h-5 text-gray-700 group-hover:text-black" />
            </div>
            <span className="text-sm font-medium text-gray-700 group-hover:text-black">Share via X</span>
          </button>

          {/* Facebook */}
          <button
            onClick={() => handleShare('facebook')}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left group"
          >
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <Facebook className="w-5 h-5 text-gray-700 group-hover:text-[#1877F2]" />
            </div>
            <span className="text-sm font-medium text-gray-700 group-hover:text-black">Share via Facebook</span>
          </button>

          {/* Instagram */}
          <button
            onClick={() => handleShare('instagram')}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left group"
          >
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <Instagram className="w-5 h-5 text-gray-700 group-hover:text-[#E4405F]" />
            </div>
            <span className="text-sm font-medium text-gray-700 group-hover:text-black">Share via Instagram</span>
          </button>

          {/* Divider */}
          <div className="border-t border-gray-200 my-1"></div>

          {/* Email */}
          <button
            onClick={() => handleShare('email')}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left group"
          >
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-gray-700 group-hover:text-black" />
            </div>
            <span className="text-sm font-medium text-gray-700 group-hover:text-black">Share via email</span>
          </button>

          {/* Divider */}
          <div className="border-t border-gray-200 my-1"></div>

          {/* Embed */}
          <button
            onClick={() => handleShare('embed')}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left group"
          >
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <Code className="w-5 h-5 text-gray-700 group-hover:text-black" />
            </div>
            <span className="text-sm font-medium text-gray-700 group-hover:text-black">Embed on my site</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default MapShareButton;

