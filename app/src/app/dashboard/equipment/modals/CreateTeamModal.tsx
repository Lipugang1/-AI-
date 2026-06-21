import React, { useState } from "react";

interface CreateTeamModalProps {
  onClose: () => void;
}

export default function CreateTeamModal({ onClose }: CreateTeamModalProps) {
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      alert("请输入班组名称");
      return;
    }
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newTeamName.trim(), description: newTeamDescription.trim() }),
      });
      if (!res.ok) throw new Error("创建失败");
      onClose();
      window.location.reload();
    } catch (error) {
      console.error("创建班组失败:", error);
      alert("创建班组失败");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold text-gray-900 mb-6">创建班组</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              班组名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="请输入班组名称"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              班组描述
            </label>
            <textarea
              value={newTeamDescription}
              onChange={(e) => setNewTeamDescription(e.target.value)}
              placeholder="请输入班组描述（选填）"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleCreateTeam}
            disabled={!newTeamName.trim()}
            className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            确认创建
          </button>
          <button
            onClick={() => {
              onClose();
              setNewTeamName("");
              setNewTeamDescription("");
            }}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
