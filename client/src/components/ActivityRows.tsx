import React from "react";
import { SvgIcon } from "./SvgIcon";

const ActivityRows = ({
  src,
  text,
  value,
}: {
  src: string;
  text: string;
  value: string;
}) => {
  return (
    <div>
      <div className="grid grid-cols-[0.8fr_2.5fr_1fr] border-b border-[#525252]/30">
        <span></span>
        <div className="flex gap-2 py-3 text-left items-center text-[#E8EAE9] text-xs border-r border-[#525252]/30">
          <SvgIcon src={src} />
          <span>{text}</span>
        </div>
        <div className="flex gap-2 py-3 justify-center items-center text-xs">
          <img src="/icons/profile-star.svg" />
          <span className="text-[#E8EAE9]">{value}</span>
        </div>
      </div>

      {/* <div className="grid grid-cols-2 px-6 py-4 hover:bg-[#222222] transition-colors">
        <div className="flex items-center gap-3 text-white text-sm">
          <FileText className="w-5 h-5 text-gray-400" />
          <span>create post</span>
        </div>
        <div className="flex items-center justify-end gap-2 text-blue-400 text-base font-semibold">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
          </svg>
          <span>20</span>
        </div>
      </div>

      <div className="grid grid-cols-2 px-6 py-4 hover:bg-[#222222] transition-colors">
        <div className="flex items-center gap-3 text-white text-sm">
          <BarChart3 className="w-5 h-5 text-gray-400" />
          <span>create poll</span>
        </div>
        <div className="flex items-center justify-end gap-2 text-blue-400 text-base font-semibold">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
          </svg>
          <span>20</span>
        </div>
      </div>

      <div className="grid grid-cols-2 px-6 py-4 hover:bg-[#222222] transition-colors">
        <div className="flex items-center gap-3 text-white text-sm">
          <Triangle className="w-5 h-5 text-gray-400" />
          <span>rate company</span>
        </div>
        <div className="flex items-center justify-end gap-2 text-blue-400 text-base font-semibold">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
          </svg>
          <span>50</span>
        </div>
      </div>

      <div className="grid grid-cols-2 px-6 py-4 hover:bg-[#222222] transition-colors">
        <div className="flex items-center gap-3 text-white text-sm">
          <MessageSquare className="w-5 h-5 text-gray-400" />
          <span>comment received / given</span>
        </div>
        <div className="flex items-center justify-end gap-2 text-blue-400 text-base font-semibold">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
          </svg>
          <span>10</span>
        </div>
      </div>

      <div className="grid grid-cols-2 px-6 py-4 hover:bg-[#222222] transition-colors">
        <div className="flex items-center gap-3 text-white text-sm">
          <ArrowUp className="w-5 h-5 text-gray-400" />
          <span>upvote received / given</span>
        </div>
        <div className="flex items-center justify-end gap-2 text-blue-400 text-base font-semibold">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
          </svg>
          <span>5</span>
        </div>
      </div>

      <div className="grid grid-cols-2 px-6 py-4 hover:bg-[#222222] transition-colors">
        <div className="flex items-center gap-3 text-white text-sm">
          <ArrowDown className="w-5 h-5 text-gray-400" />
          <span>downvote received / given</span>
        </div>
        <div className="flex items-center justify-end gap-2 text-blue-400 text-base font-semibold">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
          </svg>
          <span>5</span>
        </div>
      </div>

      <div className="grid grid-cols-2 px-6 py-4 hover:bg-[#222222] transition-colors">
        <div className="flex items-center gap-3 text-white text-sm">
          <Share2 className="w-5 h-5 text-gray-400" />
          <span>share post/poll</span>
        </div>
        <div className="flex items-center justify-end gap-2 text-blue-400 text-base font-semibold">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
          </svg>
          <span>10</span>
        </div>
      </div>

      <div className="grid grid-cols-2 px-6 py-4 hover:bg-[#222222] transition-colors">
        <div className="flex items-center gap-3 text-white text-sm">
          <Bookmark className="w-5 h-5 text-gray-400" />
          <span>bookmark received / given</span>
        </div>
        <div className="flex items-center justify-end gap-2 text-blue-400 text-base font-semibold">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
          </svg>
          <span>5</span>
        </div>
      </div> */}
    </div>
  );
};

export default ActivityRows;
