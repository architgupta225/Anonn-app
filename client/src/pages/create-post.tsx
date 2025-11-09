import React, { useState, useEffect } from "react";
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
  Search
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import CreateOrganizationModal from "@/components/CreateOrganizationModal";

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
    { id: "2", text: "" }
  ]);
  const [selectedCompany, setSelectedCompany] = useState<Organization | null>(null);
  const [showBowlSelector, setShowBowlSelector] = useState(false);
  const [showCompanySearch, setShowCompanySearch] = useState(false);
  const [bowlSearch, setBowlSearch] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreateOrganizationModal, setShowCreateOrganizationModal] = useState(false);
  const [organizationToCreate, setOrganizationToCreate] = useState("");

  const { data: bowls } = useQuery<Bowl[]>({
    queryKey: ["bowls"],
    queryFn: async () => {
      const response = await fetch("/api/bowls", { credentials: "include" });
      return response.json();
    }
  });

  const { data: organizations } = useQuery<Organization[]>({
    queryKey: ["organizations"],
    queryFn: async () => {
      const response = await fetch("/api/organizations", { credentials: "include" });
      return response.json();
    }
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    const bowlId = urlParams.get('bowlId');
    
    if (type && ['text', 'poll'].includes(type)) {
      setPostType(type as PostType);
      setStep("create");
    }
    
    if (bowlId && bowls) {
      const bowl = bowls.find(b => b.id === parseInt(bowlId));
      if (bowl) setSelectedBowl(bowl);
    }
  }, [bowls]);

  const filteredBowls = bowls?.filter(bowl =>
    bowl.name.toLowerCase().includes(bowlSearch.toLowerCase()) ||
    bowl.description.toLowerCase().includes(bowlSearch.toLowerCase())
  ) || [];

  const filteredOrganizations = organizations?.filter(org =>
    org.name.toLowerCase().includes(companySearch.toLowerCase())
  ) || [];

  const addPollOption = () => {
    const newId = (pollOptions.length + 1).toString();
    setPollOptions([...pollOptions, { id: newId, text: "" }]);
  };

  const removePollOption = (id: string) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter(option => option.id !== id));
    }
  };

  const updatePollOption = (id: string, text: string) => {
    setPollOptions(pollOptions.map(option => 
      option.id === id ? { ...option, text } : option
    ));
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
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem('postDraft', JSON.stringify(draft));
      toast({
        title: "Draft saved",
        description: "Your draft has been saved successfully",
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: "Couldn't save your draft",
        variant: "destructive"
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
      toast({ title: "Select a community", description: "Please select a community to post in", variant: "destructive" });
      return;
    }
    
    if (!title.trim()) {
      toast({ title: "Add a title", description: "Please add a title for your post", variant: "destructive" });
      return;
    }

    if (postType === "poll" && pollOptions.some(opt => !opt.text.trim())) {
      toast({ title: "Fill poll options", description: "Please fill in all poll options", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      const postData = {
        title: title.trim(),
        content: content.trim(),
        bowlId: selectedBowl.id,
        organizationId: selectedCompany?.id,
        type: postType === "poll" ? "poll" : "discussion",
        poll: postType === "poll" ? {
          title: title.trim(),
          description: content.trim(),
          options: pollOptions.map(opt => opt.text),
          allowMultipleSelections: false
        } : null
      };

      await apiRequest("POST", "/api/posts", postData);
      
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && (
            key[0] === "posts" || key[0] === "/api/posts" || key[0] === "bowl-posts" || key[0] === "organization-posts"
          );
        },
      });
      
      toast({ title: "Post created!", description: "Your post has been published" });
      localStorage.removeItem('postDraft');
      
      setTimeout(() => setLocation("/"), 200);
    } catch (error: any) {
      console.error("Error creating post:", error);
      toast({ title: "Failed to post", description: "Please try again", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === "select") {
    return (
      <div className="fixed inset-0 bg-black z-50">
        <div className="bg-[#3a3a3a] px-4 py-3 flex items-center justify-between border-b border-gray-700">
          <button onClick={() => setLocation("/")} className="text-white">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <button onClick={() => setLocation("/")} className="text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-3 mb-8 pb-4 border-b-2 border-dashed border-gray-700">
            <div className="w-12 h-12 rounded bg-gray-700 flex items-center justify-center overflow-hidden">
              {user?.username ? (
                <span className="text-white font-semibold text-lg">
                  {user.username.charAt(0).toUpperCase()}
                </span>
              ) : (
                <Users className="w-6 h-6 text-gray-400" />
              )}
            </div>
            <span className="text-gray-400 text-lg">{user?.username || 'user1234'}</span>
          </div>

          <div className="mb-8 pb-6 border-b-2 border-dashed border-gray-700">
            <p className="text-gray-600 text-sm">Choose what you wanna</p>
            <p className="text-gray-600 text-sm">create today...</p>
          </div>

          <div className="grid grid-cols-2 gap-4 p-6 rounded">
            <button
              onClick={() => { setPostType("text"); setStep("create"); }}
              className="flex flex-col items-center justify-center py-8 bg-[#1a1a1a] hover:bg-[#252525] transition-colors rounded"
            >
              <div className="mb-3">
                <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2"/>
                  <line x1="7" y1="8" x2="17" y2="8" strokeWidth="2"/>
                  <line x1="7" y1="12" x2="17" y2="12" strokeWidth="2"/>
                  <line x1="7" y1="16" x2="13" y2="16" strokeWidth="2"/>
                </svg>
              </div>
              <span className="text-white font-medium text-lg">POST</span>
            </button>

            <button
              onClick={() => { setPostType("poll"); setStep("create"); }}
              className="flex flex-col items-center justify-center py-8 bg-[#1a1a1a] hover:bg-[#252525] transition-colors rounded"
            >
              <div className="mb-3">
                <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M3 3v18h18" strokeWidth="2"/>
                  <rect x="7" y="10" width="3" height="8" fill="currentColor"/>
                  <rect x="12" y="6" width="3" height="12" fill="currentColor"/>
                  <rect x="17" y="13" width="3" height="5" fill="currentColor"/>
                </svg>
              </div>
              <span className="text-white font-medium text-lg">POLL</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="bg-[#3a3a3a] px-4 py-3 flex items-center justify-between border-b border-gray-700 flex-shrink-0">
        <button onClick={() => setStep("select")} className="text-white">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2 text-white">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2"/>
            <line x1="7" y1="8" x2="17" y2="8" strokeWidth="2"/>
          </svg>
          <span className="font-medium">{postType === "poll" ? "POLL" : "POST"}</span>
        </div>
        <button onClick={() => setLocation("/")} className="text-white">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-gray-700 flex items-center justify-center overflow-hidden">
                {user?.username ? (
                  <span className="text-white font-semibold">{user.username.charAt(0).toUpperCase()}</span>
                ) : (
                  <Users className="w-5 h-5 text-gray-400" />
                )}
              </div>
              <span className="text-gray-400">{user?.username || 'user1234'}</span>
            </div>

            <button
              onClick={() => setShowBowlSelector(true)}
              className="flex items-center gap-2 text-gray-400 hover:text-gray-300 transition-colors"
            >
              <span className="text-sm">{selectedBowl ? selectedBowl.name : 'CHOOSE COMMUNITY'}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          <div className="border border-gray-700 p-4">
            <label className="text-gray-600 text-xs mb-2 block">TITLE</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder=". ."
              className="w-full bg-transparent text-white text-lg outline-none placeholder-gray-700"
              maxLength={300}
            />
          </div>

          <div className="border border-gray-700 p-4">
            <label className="text-gray-600 text-xs mb-2 block">BODY</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder=". ."
              className="w-full bg-transparent text-white outline-none placeholder-gray-700 min-h-[100px] resize-none"
            />
            
            {postType === "text" && (
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-700">
                <button className="text-gray-400 hover:text-white transition-colors">
                  <Bold className="w-5 h-5" />
                </button>
                <button className="text-gray-400 hover:text-white transition-colors">
                  <Italic className="w-5 h-5" />
                </button>
                <button className="text-gray-400 hover:text-white transition-colors">
                  <Underline className="w-5 h-5" />
                </button>
                <button className="text-gray-400 hover:text-white transition-colors">
                  <List className="w-5 h-5" />
                </button>
                <button className="text-gray-400 hover:text-white transition-colors">
                  <Code className="w-5 h-5" />
                </button>
                <button className="text-gray-400 hover:text-white transition-colors">
                  <LinkIcon className="w-5 h-5" />
                </button>
                <button className="text-gray-400 hover:text-white transition-colors">
                  <Smile className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {postType === "poll" && (
            <div className="border border-gray-700 p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {pollOptions.map((option, index) => (
                  <div key={option.id} className="relative">
                    <input
                      type="text"
                      value={option.text}
                      onChange={(e) => updatePollOption(option.id, e.target.value)}
                      placeholder={`option ${index + 1}`}
                      className="w-full bg-[#1a1a1a] text-white px-3 py-2 rounded outline-none placeholder-gray-600"
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
              </div>
              
              <button
                onClick={addPollOption}
                className="w-full text-gray-500 hover:text-gray-400 transition-colors text-sm py-2"
              >
                Add another
              </button>
            </div>
          )}

          {postType === "text" && (
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowCompanySearch(true)}
                className="text-gray-600 hover:text-gray-400 transition-colors text-sm"
              >
                TAG A COMPANY
              </button>
              <button className="text-gray-600 hover:text-gray-400 transition-colors text-sm">
                abstract...
              </button>
              <button className="ml-auto text-gray-600 hover:text-gray-400 transition-colors">
                <Search className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 grid grid-cols-2 border-t border-gray-700">
        <button
          onClick={saveDraft}
          className="flex items-center justify-center gap-2 py-4 bg-[#1a1a1a] hover:bg-[#252525] transition-colors text-gray-400"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" strokeWidth="2"/>
            <polyline points="17 21 17 13 7 13 7 21" strokeWidth="2"/>
            <polyline points="7 3 7 8 15 8" strokeWidth="2"/>
          </svg>
          <span className="font-medium">SAVE DRAFT</span>
        </button>
        <button
          onClick={handlePost}
          disabled={isSubmitting || !selectedBowl || !title.trim()}
          className="flex items-center justify-center gap-2 py-4 bg-[#7dd3fc] hover:bg-[#6cc2eb] transition-colors text-black disabled:opacity-50"
        >
          <svg className="w-5 h-5 rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeWidth="2"/>
          </svg>
          <span className="font-semibold">{isSubmitting ? "POSTING..." : "POST"}</span>
        </button>
      </div>

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
                  <button onClick={() => setShowBowlSelector(false)} className="text-gray-400">
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
                      <div className="text-gray-400 text-sm">{bowl.description}</div>
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
                  <button onClick={() => setShowCompanySearch(false)} className="text-gray-400">
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
                        <div className="text-gray-400 text-sm">{org.description}</div>
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
                      <div className="text-green-400 font-medium">Create "{companySearch}"</div>
                      <div className="text-gray-400 text-sm">Add as new organization</div>
                    </div>
                  </button>
                ) : (
                  <div className="p-8 text-center text-gray-500">No companies found</div>
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