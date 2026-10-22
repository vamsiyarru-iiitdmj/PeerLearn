"use client";

import { useState, useEffect } from "react";
import PageShell from "../components/PageShell";
import { useAuth } from "../../lib/auth-context";
import {
  apiGetResources,
  apiCreateBucket,
  apiAddResource,
  apiDeleteResource,
  apiGetSharedBuckets,
  apiGetProposals,
  apiProposeSharedResource,
  apiVoteProposal,
  type ResourceBucket,
  type ResourceItem,
  type SharedResourceProposal,
} from "../../lib/api";

export default function ResourcesPage() {
  const { token, student } = useAuth();
  const [activeTab, setActiveTab] = useState<"PRIVATE" | "COMMUNITY">("PRIVATE");

  // Private Buckets state
  const [buckets, setBuckets] = useState<ResourceBucket[]>([]);
  const [loadingBuckets, setLoadingBuckets] = useState(true);
  const [bucketError, setBucketError] = useState<string | null>(null);

  // Modals for Private
  const [showBucketModal, setShowBucketModal] = useState(false);
  const [bucketName, setBucketName] = useState("");
  const [bucketDesc, setBucketDesc] = useState("");
  const [isCreatingBucket, setIsCreatingBucket] = useState(false);

  const [showAddResourceModal, setShowAddResourceModal] = useState(false);
  const [targetBucketId, setTargetBucketId] = useState("");
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceType, setResourceType] = useState<"PDF" | "LINK" | "NOTE" | "PHOTO">("PDF");
  const [resourceUrl, setResourceUrl] = useState("");
  const [resourceContent, setResourceContent] = useState("");
  const [isAddingResource, setIsAddingResource] = useState(false);

  // Community State
  const [sharedBuckets, setSharedBuckets] = useState<any[]>([]);
  const [proposals, setProposals] = useState<SharedResourceProposal[]>([]);
  const [loadingCommunity, setLoadingCommunity] = useState(false);

  // Modals for Community
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [proposeTitle, setProposeTitle] = useState("");
  const [proposeBucketName, setProposeBucketName] = useState("");
  const [proposeType, setProposeType] = useState<"PDF" | "LINK" | "NOTE">("PDF");
  const [proposeUrl, setProposeUrl] = useState("");
  const [proposeDesc, setProposeDesc] = useState("");
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);

  const fetchPrivateResources = async () => {
    if (!token) return;
    try {
      setLoadingBuckets(true);
      setBucketError(null);
      const data = await apiGetResources(token);
      setBuckets(data);
      if (data.length > 0 && !targetBucketId) {
        setTargetBucketId(data[0].id);
      }
    } catch (e: any) {
      setBucketError(e.message || "Failed to load resource buckets");
    } finally {
      setLoadingBuckets(false);
    }
  };

  const fetchCommunity = async () => {
    if (!token) return;
    try {
      setLoadingCommunity(true);
      const [shared, props] = await Promise.all([
        apiGetSharedBuckets(token).catch(() => []),
        apiGetProposals(token).catch(() => []),
      ]);
      setSharedBuckets(shared);
      setProposals(props);
    } catch {
      // ignore
    } finally {
      setLoadingCommunity(false);
    }
  };

  useEffect(() => {
    if (activeTab === "PRIVATE") {
      fetchPrivateResources();
    } else {
      fetchCommunity();
    }
  }, [token, activeTab]);

  const handleCreateBucket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bucketName.trim() || !token) return;
    setIsCreatingBucket(true);
    try {
      await apiCreateBucket({ name: bucketName.trim(), description: bucketDesc.trim() || undefined }, token);
      setBucketName("");
      setBucketDesc("");
      setShowBucketModal(false);
      await fetchPrivateResources();
    } catch (err: any) {
      alert("Failed to create bucket: " + err.message);
    } finally {
      setIsCreatingBucket(false);
    }
  };

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceTitle.trim() || !targetBucketId || !token) return;
    setIsAddingResource(true);
    try {
      await apiAddResource(
        {
          bucketId: targetBucketId,
          title: resourceTitle.trim(),
          type: resourceType,
          url: resourceUrl.trim() || undefined,
          content: resourceContent.trim() || undefined,
        },
        token
      );
      setResourceTitle("");
      setResourceUrl("");
      setResourceContent("");
      setShowAddResourceModal(false);
      await fetchPrivateResources();
    } catch (err: any) {
      alert("Failed to add resource: " + err.message);
    } finally {
      setIsAddingResource(false);
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (!confirm("Are you sure you want to delete this resource?")) return;
    try {
      if (token) {
        await apiDeleteResource(resourceId, token);
        await fetchPrivateResources();
      }
    } catch (err: any) {
      alert("Failed to delete resource: " + err.message);
    }
  };

  const handleVoteProposal = async (proposalId: string, vote: "UP" | "DOWN") => {
    if (!token) return;
    try {
      await apiVoteProposal(proposalId, vote, token);
      await fetchCommunity();
    } catch (err: any) {
      alert("Voting error: " + err.message);
    }
  };

  const handleProposeResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposeTitle.trim() || !token) return;
    setIsSubmittingProposal(true);
    try {
      await apiProposeSharedResource(
        {
          title: proposeTitle.trim(),
          description: proposeDesc.trim() || undefined,
          type: proposeType,
          url: proposeUrl.trim() || undefined,
          targetBucketName: proposeBucketName.trim() || undefined,
          department: student?.department || "CSE",
        },
        token
      );
      setProposeTitle("");
      setProposeDesc("");
      setProposeUrl("");
      setProposeBucketName("");
      setShowProposeModal(false);
      alert("Proposal submitted! Batch peers have 24 hours to vote.");
      await fetchCommunity();
    } catch (err: any) {
      alert("Failed to propose resource: " + err.message);
    } finally {
      setIsSubmittingProposal(false);
    }
  };

  return (
    <PageShell>
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1
            style={{
              fontFamily: "var(--font-newsreader)",
              fontSize: 28,
              fontWeight: 500,
              color: "var(--color-primary)",
              margin: 0,
            }}
          >
            Academic Materials &amp; Buckets
          </h1>
          <p
            style={{
              fontFamily: "var(--font-jakarta)",
              fontSize: 13,
              color: "var(--color-on-surface-variant)",
              marginTop: 4,
            }}
          >
            Private study vaults and peer-verified batch archives.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "PRIVATE" ? (
            <>
              <button
                onClick={() => setShowBucketModal(true)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer border flex items-center gap-1.5 transition-colors"
                style={{
                  backgroundColor: "var(--color-surface-container-highest)",
                  color: "var(--color-primary)",
                  borderColor: "var(--color-outline-variant)",
                }}
              >
                <span className="material-symbols-outlined text-[16px]">create_new_folder</span>
                New Bucket
              </button>
              <button
                onClick={() => setShowAddResourceModal(true)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-colors"
                style={{
                  backgroundColor: "var(--color-primary-container)",
                  color: "var(--color-on-primary)",
                  border: "none",
                }}
              >
                <span className="material-symbols-outlined text-[16px]">upload_file</span>
                Add Material
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowProposeModal(true)}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-colors"
              style={{
                backgroundColor: "var(--color-primary-container)",
                color: "var(--color-on-primary)",
                border: "none",
              }}
            >
              <span className="material-symbols-outlined text-[16px]">how_to_vote</span>
              Propose to Batch
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b pb-2" style={{ borderColor: "var(--color-outline-variant)" }}>
        <button
          onClick={() => setActiveTab("PRIVATE")}
          className="px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-2"
          style={{
            backgroundColor: activeTab === "PRIVATE" ? "var(--color-primary-container)" : "transparent",
            color: activeTab === "PRIVATE" ? "var(--color-on-primary)" : "var(--color-on-surface-variant)",
            border: "none",
          }}
        >
          <span className="material-symbols-outlined text-[16px]">lock</span>
          Private Vaults
        </button>
        <button
          onClick={() => setActiveTab("COMMUNITY")}
          className="px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-2"
          style={{
            backgroundColor: activeTab === "COMMUNITY" ? "var(--color-primary-container)" : "transparent",
            color: activeTab === "COMMUNITY" ? "var(--color-on-primary)" : "var(--color-on-surface-variant)",
            border: "none",
          }}
        >
          <span className="material-symbols-outlined text-[16px]">groups</span>
          Batch Verified &amp; Voting ({proposals.length} active)
        </button>
      </div>

      {/* TAB 1: PRIVATE BUCKETS */}
      {activeTab === "PRIVATE" && (
        <div className="space-y-6">
          {loadingBuckets && (
            <div className="p-8 text-center text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
              Loading your study buckets…
            </div>
          )}

          {bucketError && (
            <div className="p-4 rounded-xl text-sm" style={{ backgroundColor: "var(--color-error-container)", color: "var(--color-on-error-container)" }}>
              {bucketError}
            </div>
          )}

          {!loadingBuckets && buckets.length === 0 && (
            <div
              className="p-12 text-center rounded-2xl border"
              style={{
                backgroundColor: "var(--color-surface-container-low)",
                borderColor: "var(--color-outline-variant)",
              }}
            >
              <span className="material-symbols-outlined text-[42px] block mb-2" style={{ color: "var(--color-outline)" }}>
                folder_open
              </span>
              <h4 style={{ fontFamily: "var(--font-newsreader)", fontSize: 18, color: "var(--color-on-surface)", margin: "0 0 6px" }}>
                No private buckets created yet
              </h4>
              <p style={{ color: "var(--color-on-surface-variant)", fontSize: 13, margin: "0 0 16px" }}>
                Create your first bucket (e.g. &quot;Operating Systems&quot; or &quot;Maths II&quot;) to store lecture notes and past exams.
              </p>
              <button
                onClick={() => setShowBucketModal(true)}
                className="btn-primary inline-flex items-center gap-1.5 cursor-pointer"
                style={{ backgroundColor: "var(--color-primary-container)", color: "var(--color-on-primary)" }}
              >
                <span className="material-symbols-outlined text-[16px]">create_new_folder</span>
                Create First Bucket
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {buckets.map((bucket) => {
              const allItems = [
                ...(bucket.resources?.pdfs || []),
                ...(bucket.resources?.links || []),
                ...(bucket.resources?.notes || []),
                ...(bucket.resources?.photos || []),
              ];

              return (
                <div
                  key={bucket.id}
                  className="p-5 rounded-2xl border shadow-sm flex flex-col justify-between"
                  style={{
                    backgroundColor: "var(--color-surface-container-low)",
                    borderColor: "var(--color-outline-variant)",
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[20px]" style={{ color: "var(--color-primary-container)" }}>
                          folder
                        </span>
                        <h3 style={{ fontFamily: "var(--font-newsreader)", fontSize: 18, fontWeight: 600, color: "var(--color-primary)", margin: 0 }}>
                          {bucket.name}
                        </h3>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--color-surface-container-highest)", color: "var(--color-on-surface-variant)" }}>
                        {allItems.length} items
                      </span>
                    </div>

                    {bucket.description && (
                      <p className="text-xs mb-3" style={{ color: "var(--color-on-surface-variant)" }}>
                        {bucket.description}
                      </p>
                    )}

                    {/* Resources in bucket */}
                    <div className="space-y-2 mt-3">
                      {allItems.length === 0 ? (
                        <p className="text-xs italic py-2 text-center" style={{ color: "var(--color-outline)" }}>
                          Empty bucket. Click &quot;Add Material&quot; to upload notes.
                        </p>
                      ) : (
                        allItems.map((res) => (
                          <div
                            key={res.id}
                            className="p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors"
                            style={{
                              backgroundColor: "var(--color-surface-container-lowest, #ffffff)",
                              borderColor: "var(--color-outline-variant)",
                            }}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span
                                className="material-symbols-outlined text-[16px] flex-shrink-0"
                                style={{
                                  color:
                                    res.type === "PDF"
                                      ? "#ba1a1a"
                                      : res.type === "LINK"
                                      ? "var(--color-primary-container)"
                                      : "#2e7d63",
                                }}
                              >
                                {res.type === "PDF" ? "picture_as_pdf" : res.type === "LINK" ? "link" : "description"}
                              </span>
                              <div className="min-w-0">
                                <div className="font-semibold truncate" style={{ color: "var(--color-on-surface)" }}>
                                  {res.title}
                                </div>
                                {res.url && (
                                  <a
                                    href={res.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] text-blue-600 truncate hover:underline block"
                                  >
                                    {res.url}
                                  </a>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={() => handleDeleteResource(res.id)}
                              className="p-1 text-gray-400 hover:text-red-600 cursor-pointer flex-shrink-0"
                              title="Delete resource"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="pt-3 mt-4 border-t flex justify-end">
                    <button
                      onClick={() => {
                        setTargetBucketId(bucket.id);
                        setShowAddResourceModal(true);
                      }}
                      className="text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      style={{ color: "var(--color-primary-container)", background: "none", border: "none" }}
                    >
                      <span className="material-symbols-outlined text-[15px]">add</span>
                      Add to this bucket
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: COMMUNITY VERIFIED & VOTING */}
      {activeTab === "COMMUNITY" && (
        <div className="space-y-6">
          {loadingCommunity && (
            <div className="p-8 text-center text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
              Loading shared resources and active proposals…
            </div>
          )}

          <div>
            <h3 style={{ fontFamily: "var(--font-newsreader)", fontSize: 20, fontWeight: 500, color: "var(--color-primary)", marginBottom: "0.75rem" }}>
              Active Proposals Awaiting Batch Votes (24h Window)
            </h3>

            {proposals.length === 0 ? (
              <div className="p-6 rounded-xl border text-center text-sm" style={{ backgroundColor: "var(--color-surface-container-low)", borderColor: "var(--color-outline-variant)", color: "var(--color-on-surface-variant)" }}>
                No active proposals right now. Propose a new resource or solution set to kickstart peer voting!
              </div>
            ) : (
              <div className="space-y-3">
                {proposals.map((prop) => (
                  <div
                    key={prop.id}
                    className="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    style={{
                      backgroundColor: "var(--color-surface-container-low)",
                      borderColor: "var(--color-outline-variant)",
                    }}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase" style={{ backgroundColor: "var(--color-secondary-fixed)", color: "var(--color-on-secondary-fixed)" }}>
                          {prop.type}
                        </span>
                        <h4 style={{ fontFamily: "var(--font-jakarta)", fontSize: 15, fontWeight: 600, color: "var(--color-on-surface)", margin: 0 }}>
                          {prop.title}
                        </h4>
                      </div>
                      {prop.description && (
                        <p className="text-xs mt-1" style={{ color: "var(--color-on-surface-variant)" }}>
                          {prop.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 text-[11px]" style={{ color: "var(--color-outline)" }}>
                        <span>Target: {prop.target_bucket_name || "General Archive"}</span>
                        <span>·</span>
                        <span>{prop.department}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => handleVoteProposal(prop.id, "UP")}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                        style={{ backgroundColor: "#e8f5e9", color: "#2e7d32", border: "1px solid #c8e6c9" }}
                      >
                        <span className="material-symbols-outlined text-[16px]">thumb_up</span>
                        {prop.upvotes_count || 0}
                      </button>
                      <button
                        onClick={() => handleVoteProposal(prop.id, "DOWN")}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                        style={{ backgroundColor: "#ffebee", color: "#c62828", border: "1px solid #ffcdd2" }}
                      >
                        <span className="material-symbols-outlined text-[16px]">thumb_down</span>
                        {prop.downvotes_count || 0}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE BUCKET MODAL */}
      {showBucketModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowBucketModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: "var(--color-surface-container-lowest, #ffffff)", border: "1px solid var(--color-outline-variant)" }}
          >
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 style={{ fontFamily: "var(--font-newsreader)", fontSize: 20, fontWeight: 600, color: "var(--color-primary)" }}>
                Create Private Study Bucket
              </h3>
              <button onClick={() => setShowBucketModal(false)} className="p-1 text-gray-500 cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateBucket} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-on-surface-variant)" }}>
                  Bucket Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Operating Systems, Computer Architecture"
                  value={bucketName}
                  onChange={(e) => setBucketName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-on-surface-variant)" }}>
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Midsem lecture slides, assignment guides, and reference books"
                  value={bucketDesc}
                  onChange={(e) => setBucketDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowBucketModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                  style={{ backgroundColor: "var(--color-surface-container)", color: "var(--color-on-surface-variant)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingBucket || !bucketName.trim()}
                  className="px-5 py-2 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: "var(--color-primary-container)", color: "var(--color-on-primary)" }}
                >
                  {isCreatingBucket ? "Creating…" : "Create Bucket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD RESOURCE MODAL */}
      {showAddResourceModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowAddResourceModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: "var(--color-surface-container-lowest, #ffffff)", border: "1px solid var(--color-outline-variant)" }}
          >
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 style={{ fontFamily: "var(--font-newsreader)", fontSize: 20, fontWeight: 600, color: "var(--color-primary)" }}>
                Add Material to Bucket
              </h3>
              <button onClick={() => setShowAddResourceModal(false)} className="p-1 text-gray-500 cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleAddResource} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-on-surface-variant)" }}>
                  Target Bucket *
                </label>
                <select
                  value={targetBucketId}
                  onChange={(e) => setTargetBucketId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm bg-white"
                  required
                >
                  {buckets.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-on-surface-variant)" }}>
                  Resource Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Virtual Memory Summary Notes &amp; PYQs"
                  value={resourceTitle}
                  onChange={(e) => setResourceTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-on-surface-variant)" }}>
                    Type
                  </label>
                  <select
                    value={resourceType}
                    onChange={(e) => setResourceType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border text-sm bg-white"
                  >
                    <option value="PDF">PDF Document</option>
                    <option value="LINK">Web Link</option>
                    <option value="NOTE">Study Note</option>
                    <option value="PHOTO">Diagram / Photo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-on-surface-variant)" }}>
                    Resource URL / Storage Link
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={resourceUrl}
                    onChange={(e) => setResourceUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-on-surface-variant)" }}>
                  Notes / Text Content (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Key concepts or textbook reference notes…"
                  value={resourceContent}
                  onChange={(e) => setResourceContent(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddResourceModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                  style={{ backgroundColor: "var(--color-surface-container)", color: "var(--color-on-surface-variant)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingResource || !resourceTitle.trim() || !targetBucketId}
                  className="px-5 py-2 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: "var(--color-primary-container)", color: "var(--color-on-primary)" }}
                >
                  {isAddingResource ? "Saving…" : "Save Resource"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROPOSE TO BATCH MODAL */}
      {showProposeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowProposeModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: "var(--color-surface-container-lowest, #ffffff)", border: "1px solid var(--color-outline-variant)" }}
          >
            <div className="flex items-center justify-between pb-2 border-b">
              <div>
                <h3 style={{ fontFamily: "var(--font-newsreader)", fontSize: 20, fontWeight: 600, color: "var(--color-primary)" }}>
                  Propose Material to Batch Archive
                </h3>
                <p className="text-xs text-gray-500">
                  Batches verify past papers and solution sheets through 24h peer voting.
                </p>
              </div>
              <button onClick={() => setShowProposeModal(false)} className="p-1 text-gray-500 cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleProposeResource} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-on-surface-variant)" }}>
                  Material Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2025 Midsem Exam Papers &amp; Solution Key"
                  value={proposeTitle}
                  onChange={(e) => setProposeTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-on-surface-variant)" }}>
                    Target Category
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PYQs, Dev, CP"
                    value={proposeBucketName}
                    onChange={(e) => setProposeBucketName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-on-surface-variant)" }}>
                    Format
                  </label>
                  <select
                    value={proposeType}
                    onChange={(e) => setProposeType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border text-sm bg-white"
                  >
                    <option value="PDF">PDF Document</option>
                    <option value="LINK">Web Link</option>
                    <option value="NOTE">Study Note</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-on-surface-variant)" }}>
                  Download / Drive URL
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={proposeUrl}
                  onChange={(e) => setProposeUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-on-surface-variant)" }}>
                  Verification Note (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Why is this resource reliable? (e.g. Checked against professor's key)"
                  value={proposeDesc}
                  onChange={(e) => setProposeDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowProposeModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                  style={{ backgroundColor: "var(--color-surface-container)", color: "var(--color-on-surface-variant)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProposal || !proposeTitle.trim()}
                  className="px-5 py-2 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: "var(--color-primary-container)", color: "var(--color-on-primary)" }}
                >
                  {isSubmittingProposal ? "Submitting…" : "Broadcast Proposal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}
