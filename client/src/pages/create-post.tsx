import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  X,
  Plus,
  ArrowLeft,
  Bold,
  Italic,
  Underline,
  List,
  Code,
  Link as LinkIcon,
  Smile,
  ChevronDown,
  Users,
  Building,
  Search,
  Image,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import CreateOrganizationModal from "@/components/CreateOrganizationModal";
import { SvgIcon } from "@/components/SvgIcon";

interface Bowl {
  id: number;
  name: string;
  description: string;
  category: string;
  icon?: string;
}

interface Organization {
  id: number;
  name: string;
  description: string;
}

interface PollOption {
  id: string;
  text: string;
}

type PostType = "text" | "poll";
type CreateStep = "select" | "create";

// Text formatting utility functions
const formatText = (command: string, value: string = "") => {
  document.execCommand(command, false, value);
  document.getElementById("content-editable")?.focus();
};

const insertImage = () => {
  const url = prompt("Enter image URL:");
  if (url) {
    formatText("insertImage", url);
  }
};

const createLink = () => {
  const url = prompt("Enter URL:");
  if (url) {
    formatText("createLink", url);
  }
};

const insertEmoji = (emoji: string) => {
  formatText("insertText", emoji);
};

export default function CreatePost() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<CreateStep>("select");
  const [postType, setPostType] = useState<PostType>("text");
  const [selectedBowl, setSelectedBowl] = useState<Bowl | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pollOptions, setPollOptions] = useState<PollOption[]>([
    { id: "1", text: "" },
    { id: "2", text: "" },
  ]);
  const [selectedCompany, setSelectedCompany] = useState<Organization | null>(
    null
  );
  const [showBowlSelector, setShowBowlSelector] = useState(false);
  const [showCompanySearch, setShowCompanySearch] = useState(false);
  const [bowlSearch, setBowlSearch] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreateOrganizationModal, setShowCreateOrganizationModal] =
    useState(false);
  const [organizationToCreate, setOrganizationToCreate] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const contentEditableRef = useRef<HTMLDivElement>(null);

  const { data: bowls } = useQuery<Bowl[]>({
    queryKey: ["bowls"],
    queryFn: async () => {
      const response = await fetch("/api/bowls", { credentials: "include" });
      return response.json();
    },
  });

  const { data: organizations } = useQuery<Organization[]>({
    queryKey: ["organizations"],
    queryFn: async () => {
      const response = await fetch("/api/organizations", {
        credentials: "include",
      });
      return response.json();
    },
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get("type");
    const bowlId = urlParams.get("bowlId");

    if (type && ["text", "poll"].includes(type)) {
      setPostType(type as PostType);
      setStep("create");
    }

    if (bowlId && bowls) {
      const bowl = bowls.find((b) => b.id === parseInt(bowlId));
      if (bowl) setSelectedBowl(bowl);
    }
  }, [bowls]);

  // Common emojis for quick access
  const commonEmojis = [
    "😊",
    "😂",
    "❤️",
    "🔥",
    "👍",
    "👎",
    "🎉",
    "🙏",
    "🤔",
    "👀",
  ];

  const handleContentChange = () => {
    if (contentEditableRef.current) {
      setContent(contentEditableRef.current.innerHTML);
    }
  };

  const filteredBowls =
    bowls?.filter(
      (bowl) =>
        bowl.name.toLowerCase().includes(bowlSearch.toLowerCase()) ||
        bowl.description.toLowerCase().includes(bowlSearch.toLowerCase())
    ) || [];

  const filteredOrganizations =
    organizations?.filter((org) =>
      org.name.toLowerCase().includes(companySearch.toLowerCase())
    ) || [];

  const addPollOption = () => {
    const newId = (pollOptions.length + 1).toString();
    setPollOptions([...pollOptions, { id: newId, text: "" }]);
  };

  const removePollOption = (id: string) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((option) => option.id !== id));
    }
  };

  const updatePollOption = (id: string, text: string) => {
    setPollOptions(
      pollOptions.map((option) =>
        option.id === id ? { ...option, text } : option
      )
    );
  };

  const saveDraft = () => {
    try {
      const draft = {
        title,
        content,
        selectedBowl,
        selectedCompany,
        postType,
        pollOptions,
        timestamp: new Date().toISOString(),
      };

      localStorage.setItem("postDraft", JSON.stringify(draft));
      toast({
        title: "Draft saved",
        description: "Your draft has been saved successfully",
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: "Couldn't save your draft",
        variant: "destructive",
      });
    }
  };

  const handleCreateOrganization = (searchTerm: string) => {
    if (!searchTerm?.trim()) return;
    setOrganizationToCreate(searchTerm.trim());
    setShowCreateOrganizationModal(true);
  };

  const handleOrganizationCreated = (organization: Organization) => {
    setSelectedCompany(organization);
    setShowCompanySearch(false);
    setCompanySearch("");
    queryClient.invalidateQueries({ queryKey: ["organizations"] });
  };

  const handlePost = async () => {
    if (!selectedBowl) {
      toast({
        title: "Select a community",
        description: "Please select a community to post in",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Add a title",
        description: "Please add a title for your post",
        variant: "destructive",
      });
      return;
    }

    if (postType === "poll" && pollOptions.some((opt) => !opt.text.trim())) {
      toast({
        title: "Fill poll options",
        description: "Please fill in all poll options",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // For rich text content, we need to handle HTML properly
      const postContent =
        content.trim() || contentEditableRef.current?.innerText || "";

      const postData = {
        title: title.trim(),
        content: postContent,
        htmlContent: content, // Store the HTML content for rich text
        bowlId: selectedBowl.id,
        organizationId: selectedCompany?.id,
        type: postType === "poll" ? "poll" : "discussion",
        poll:
          postType === "poll"
            ? {
                title: title.trim(),
                description: postContent,
                options: pollOptions.map((opt) => opt.text),
                allowMultipleSelections: false,
              }
            : null,
      };

      await apiRequest("POST", "/api/posts", postData);

      await queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return (
            Array.isArray(key) &&
            (key[0] === "posts" ||
              key[0] === "/api/posts" ||
              key[0] === "bowl-posts" ||
              key[0] === "organization-posts")
          );
        },
      });

      toast({
        title: "Post created!",
        description: "Your post has been published",
      });
      localStorage.removeItem("postDraft");

      setTimeout(() => setLocation("/"), 200);
    } catch (error: any) {
      console.error("Error creating post:", error);
      toast({
        title: "Failed to post",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Rest of the component remains the same until the text formatting section...

  if (step === "select") {
    return (
      <div className="fixed inset-0 bg-[#17181C] z-50">
        <div className="bg-[#3a3a3a] px-4 py-2 flex items-center justify-between">
          <button onClick={() => setLocation("/")}>
            <img src="/icons/Arrow-left.svg" alt="Back Icon" />
          </button>
          <button onClick={() => setLocation("/")}>
            <img src="/icons/x-close.svg" alt="close" />
          </button>
        </div>

        <div className="px-9 py-6 flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center overflow-hidden">
              {user?.username ? (
                <span className="text-white font-semibold text-lg">
                  {user.username.charAt(0).toUpperCase()}
                </span>
              ) : (
                <img src="/icons/dummyAvatar.png" alt="Profile Pic" />
              )}
            </div>
            <span className="text-[#8E8E93] text-xs">
              {user?.username || "user1234"}
            </span>
          </div>

          <div>
            <p className="text-[#525252] text-xs font-normal">
              Choose what you wanna
            </p>
            <p className="text-[#525252] text-xs font-normal">
              create today...
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => {
                setPostType("text");
                setStep("create");
              }}
              className="h-[70px] flex flex-col md:flex-row gap-4 items-center border-[0.2px] border-[#525252]/30 justify-center hover:bg-[#252525] transition-colors"
            >
              <div className="mb-3 md:mb-0 text-[#E8EAE9]">
                <SvgIcon src="/icons/Post option icon.svg" />
              </div>
              <span className="text-[#E8EAE9] font-medium text-xs">POST</span>
            </button>

            <button
              onClick={() => {
                setPostType("poll");
                setStep("create");
              }}
              className="h-[70px] flex flex-col md:flex-row gap-4 items-center border-[0.2px] border-[#525252]/30 justify-center hover:bg-[#252525] transition-colors"
            >
              <div className="mb-3 md:mb-0 text-[#E8EAE9]">
                <SvgIcon src="/icons/Polls icon.svg" />
              </div>
              <span className="text-[#E8EAE9] font-medium text-xs">POLL</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col fixed inset-0 bg-[#17181C] z-50">
      <div className="bg-[#3a3a3a] px-4 py-2 flex items-center justify-between flex-shrink-0">
        <button onClick={() => setStep("select")}>
          <img src="/icons/Arrow-left.svg" alt="Back Icon" />
        </button>
        <div className="flex items-center gap-4 text-[#E8EAE9]">
          {postType === "poll" ? (
            <>
              <SvgIcon src="/icons/Polls icon.svg" />
              <span className="font-medium text-xs">POLL</span>
            </>
          ) : (
            <>
              <SvgIcon src="/icons/Post option icon.svg" />
              <span className="font-medium text-xs">POST</span>
            </>
          )}
        </div>
        <button onClick={() => setLocation("/")}>
          <img src="/icons/x-close.svg" alt="close" />
        </button>
      </div>

      <div className="flex-1 py-6  overflow-y-auto">
        <div className="space-y-6">
          <div className="px-9 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center overflow-hidden">
                  {user?.username ? (
                    <span className="text-white font-semibold">
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                  ) : (
                    <img src="/icons/dummyAvatar.png" alt="Profile Pic" />
                  )}
                </div>
                <span className="text-[#8E8E93] text-xs">
                  {user?.username || "user1234"}
                </span>
              </div>

              <button
                onClick={() => setShowBowlSelector(true)}
                className="flex p-4 rounded-[58px] bg-[#1B1C20] gap-4 items-center text-[#525252] hover:text-gray-300 transition-colors"
              >
                <span className="text-xs">
                  {selectedBowl ? selectedBowl.name : "CHOOSE COMMUNITY"}
                </span>
                <SvgIcon src="/icons/dropdown-icon.svg" />
              </button>
            </div>

            <div className="relative">
              <label className="h-4 w-[84px] py-1 z-10 bg-[#17181C] flex justify-center items-center absolute -top-2 left-6 text-xs text-[#525252] border-[0.2px] border-[#525252]/30">
                TITLE
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-20 py-2 px-9 bg-[rgba(234,234,234,0.04)] text-[#E8EAE9] text-sm outline-none"
                maxLength={300}
              />
            </div>

            <div className="relative">
              <label className="h-4 w-[84px] py-1 z-10 bg-[#17181C] flex justify-center items-center absolute -top-2 left-6 text-xs text-[#525252] border-[0.2px] border-[#525252]/30">
                BODY
              </label>

              {/* Content Editable Area for Rich Text */}
              <div
                ref={contentEditableRef}
                id="content-editable"
                contentEditable
                onInput={handleContentChange}
                className="w-full h-[140px] py-6 px-9 bg-[rgba(234,234,234,0.04)] text-[#E8EAE9] text-sm outline-none"
                style={{
                  caretColor: "white",
                  lineHeight: "1.5",
                }}
              />

              {postType === "text" && (
                <div className="flex items-center gap-2 mt-4 pt-4 flex-wrap">
                  {/* Text Formatting Buttons */}
                  <button
                    onClick={() => formatText("bold")}
                    className="text-gray-400 hover:text-white transition-colors p-2 rounded hover:bg-gray-700"
                    title="Bold"
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => formatText("italic")}
                    className="text-gray-400 hover:text-white transition-colors p-2 rounded hover:bg-gray-700"
                    title="Italic"
                  >
                    <Italic className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => formatText("underline")}
                    className="text-gray-400 hover:text-white transition-colors p-2 rounded hover:bg-gray-700"
                    title="Underline"
                  >
                    <Underline className="w-4 h-4" />
                  </button>

                  {/* Lists */}
                  <button
                    onClick={() => formatText("insertUnorderedList")}
                    className="text-gray-400 hover:text-white transition-colors p-2 rounded hover:bg-gray-700"
                    title="Bullet List"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => formatText("insertOrderedList")}
                    className="text-gray-400 hover:text-white transition-colors p-2 rounded hover:bg-gray-700"
                    title="Numbered List"
                  >
                    <List className="w-4 h-4" />
                  </button>

                  {/* Code & Quote */}
                  <button
                    onClick={() => formatText("formatBlock", "<pre>")}
                    className="text-gray-400 hover:text-white transition-colors p-2 rounded hover:bg-gray-700"
                    title="Code Block"
                  >
                    <Code className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => formatText("formatBlock", "<blockquote>")}
                    className="text-gray-400 hover:text-white transition-colors p-2 rounded hover:bg-gray-700"
                    title="Quote"
                  >
                    <Quote className="w-4 h-4" />
                  </button>

                  {/* Link & Image */}
                  <button
                    onClick={createLink}
                    className="text-gray-400 hover:text-white transition-colors p-2 rounded hover:bg-gray-700"
                    title="Insert Link"
                  >
                    <LinkIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={insertImage}
                    className="text-gray-400 hover:text-white transition-colors p-2 rounded hover:bg-gray-700"
                    title="Insert Image"
                  >
                    <Image className="w-4 h-4" />
                  </button>

                  {/* Text Alignment */}
                  <button
                    onClick={() => formatText("justifyLeft")}
                    className="text-gray-400 hover:text-white transition-colors p-2 rounded hover:bg-gray-700"
                    title="Align Left"
                  >
                    <AlignLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => formatText("justifyCenter")}
                    className="text-gray-400 hover:text-white transition-colors p-2 rounded hover:bg-gray-700"
                    title="Align Center"
                  >
                    <AlignCenter className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => formatText("justifyRight")}
                    className="text-gray-400 hover:text-white transition-colors p-2 rounded hover:bg-gray-700"
                    title="Align Right"
                  >
                    <AlignRight className="w-4 h-4" />
                  </button>

                  {/* Emoji Picker */}
                  <div className="relative">
                    <button
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="text-gray-400 hover:text-white transition-colors p-2 rounded hover:bg-gray-700"
                      title="Insert Emoji"
                    >
                      <Smile className="w-4 h-4" />
                    </button>

                    {showEmojiPicker && (
                      <div className="absolute bottom-full left-0 mb-2 bg-[#2a2a2a] border border-gray-600 rounded-lg p-2 grid grid-cols-5 gap-1 z-10">
                        {commonEmojis.map((emoji, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              insertEmoji(emoji);
                              setShowEmojiPicker(false);
                            }}
                            className="w-8 h-8 flex items-center justify-center hover:bg-gray-600 rounded text-lg"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Clear Formatting */}
                  <button
                    onClick={() => formatText("removeFormat")}
                    className="text-gray-400 hover:text-white transition-colors p-2 rounded hover:bg-gray-700 text-xs font-medium"
                    title="Clear Formatting"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          </div>

          {postType === "poll" && (
            <div className="px-9 py-6">
              <div className="grid grid-cols-2 gap-4">
                {pollOptions.map((option, index) => (
                  <div key={option.id} className="relative">
                    <input
                      type="text"
                      value={option.text}
                      onChange={(e) =>
                        updatePollOption(option.id, e.target.value)
                      }
                      placeholder={`option ${index + 1}`}
                      className="w-full py-3 px-6 text-[#E8EAE9] placeholder:text-[#525252] text-xs font-normal border border-[#525252]/30 focus:border-gray-400"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        onClick={() => removePollOption(option.id)}
                        className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addPollOption}
                  className="w-full py-3 px-6 bg-[rgba(234,234,234,0.04)] text-[#525252] text-xs font-normal"
                >
                  Add another
                </button>
              </div>
            </div>
          )}

          {postType === "text" && (
            <div className="border-t border-[#525252]/30 px-9 py-6">
              {/* Display selected company tag */}
              <div className="flex items-center gap-9">
                <span className="text-[#525252] transition-colors text-xs">
                  TAG A COMPANY
                </span>
                <button
                  onClick={() => setShowCompanySearch(true)}
                  className="w-2/4 text-left  flex border-[0.2px] border-[#525252]/30"
                >
                  <div className="flex-1 text-[#525252] px-9 py-4">
                    abstract...
                  </div>
                  <div className="bg-[#373737] text-[#E8EAE9] px-6 flex justify-center items-center">
                    <SvgIcon src="/icons/Search icon.svg" />
                  </div>
                </button>
              </div>

              {selectedCompany && (
                <div className="border-[0.2px] border-[#525252]/30 p-6 mt-4 w-fit">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4">
                      <img src="/icons/Company icon.png" alt="Company icon" />
                      <span className="text-[#E8EAE9] text-xs font-medium">
                        {selectedCompany.name}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedCompany(null)}
                      className="text-gray-400 hover:text-red-400 transition-colors"
                      title="Remove company tag"
                    >
                      <img src="/icons/x-close.svg" alt="close" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 grid grid-cols-3 border-t border-[#525252]/30">
        <button
          onClick={saveDraft}
          className="flex items-center justify-center border-r border-[#525252]/30 gap-2 py-3 px-12 bg-[#17181C] hover:bg-[#252525] transition-colors text-[#E8EAE9]"
        >
          <SvgIcon src="/icons/Save-draft.svg" />
          <span className="font-normal text-xs">SAVE DRAFT</span>
        </button>
        <div></div>
        <button
          onClick={handlePost}
          disabled={isSubmitting || !selectedBowl || !title.trim()}
          className="flex items-center justify-center text-[#17181C] gap-2 py-4 bg-gradient-to-br from-[#A0D9FF] to-[#E8EAE9] hover:bg-gradient-to-br hover:from-[#a5dafe] hover:to-[#edf0ef] transition-colors disabled:opacity-50"
        >
          <SvgIcon src="/icons/Publish-icon.svg" />
          <span className="font-normal text-xs">
            {isSubmitting ? "POSTING..." : "POST"}
          </span>
        </button>
      </div>

      {/* Rest of the modals remain the same */}
      <AnimatePresence>
        {showBowlSelector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-end"
            onClick={() => setShowBowlSelector(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full bg-[#1a1a1a] rounded-t-2xl max-h-[70vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-semibold">Select Community</h3>
                  <button
                    onClick={() => setShowBowlSelector(false)}
                    className="text-gray-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Search communities..."
                  value={bowlSearch}
                  onChange={(e) => setBowlSearch(e.target.value)}
                  className="w-full bg-[#2a2a2a] text-white px-3 py-2 rounded outline-none"
                />
              </div>
              <div className="flex-1 overflow-y-auto">
                {filteredBowls.map((bowl) => (
                  <button
                    key={bowl.id}
                    onClick={() => {
                      setSelectedBowl(bowl);
                      setShowBowlSelector(false);
                      setBowlSearch("");
                    }}
                    className="w-full flex items-center gap-3 p-4 hover:bg-[#252525] transition-colors border-b border-gray-800"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="text-white font-medium">{bowl.name}</div>
                      <div className="text-gray-400 text-sm">
                        {bowl.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCompanySearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-end"
            onClick={() => setShowCompanySearch(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full bg-[#1a1a1a] rounded-t-2xl max-h-[70vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-semibold">Tag Company</h3>
                  <button
                    onClick={() => setShowCompanySearch(false)}
                    className="text-gray-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Search companies..."
                  value={companySearch}
                  onChange={(e) => setCompanySearch(e.target.value)}
                  className="w-full bg-[#2a2a2a] text-white px-3 py-2 rounded outline-none"
                />
              </div>
              <div className="flex-1 overflow-y-auto">
                {filteredOrganizations.length > 0 ? (
                  filteredOrganizations.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => {
                        setSelectedCompany(org);
                        setShowCompanySearch(false);
                        setCompanySearch("");
                      }}
                      className="w-full flex items-center gap-3 p-4 hover:bg-[#252525] transition-colors border-b border-gray-800"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                        <Building className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="text-white font-medium">{org.name}</div>
                        <div className="text-gray-400 text-sm">
                          {org.description}
                        </div>
                      </div>
                    </button>
                  ))
                ) : companySearch.trim() ? (
                  <button
                    onClick={() => handleCreateOrganization(companySearch)}
                    className="w-full flex items-center gap-3 p-4 hover:bg-green-900/20 transition-colors border-b border-gray-800"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                      <Plus className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="text-green-400 font-medium">
                        Create "{companySearch}"
                      </div>
                      <div className="text-gray-400 text-sm">
                        Add as new organization
                      </div>
                    </div>
                  </button>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    No companies found
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CreateOrganizationModal
        isOpen={showCreateOrganizationModal}
        onClose={() => setShowCreateOrganizationModal(false)}
        organizationName={organizationToCreate}
        onOrganizationCreated={handleOrganizationCreated}
      />
    </div>
  );
}
