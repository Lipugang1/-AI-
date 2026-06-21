import React from "react";
import { Area } from "../types";

interface AddEquipmentModalProps {
  areas: Area[];
  selectedAreaId: string;
  isCustomType: boolean;
  customType: string;
  newEquipmentType: string;
  newEquipmentCode: string;
  newResponsiblePerson: string;
  addingEquipment: boolean;
  onAreaChange: (id: string) => void;
  onEquipmentTypeChange: (type: string) => void;
  onCustomTypeChange: (type: string) => void;
  onCodeChange: (code: string) => void;
  onPersonChange: (person: string) => void;
  onCreate: () => void;
  onBack: () => void;
  onToggleCustomType: (isCustom: boolean) => void;
}

export default function AddEquipmentModal({
  areas,
  selectedAreaId,
  isCustomType,
  customType,
  newEquipmentType,
  newEquipmentCode,
  newResponsiblePerson,
  addingEquipment,
  onAreaChange,
  onEquipmentTypeChange,
  onCustomTypeChange,
  onCodeChange,
  onPersonChange,
  onCreate,
  onBack,
  onToggleCustomType,
}: AddEquipmentModalProps) {
  return (
    <div>
      <div className="mb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-xl hover:bg-gray-50 shadow-md border border-gray-200 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">添加消防器材</h2>
        </div>

        <div className="space-y-6">
          {areas.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                所属区域
              </label>
              <select
                value={selectedAreaId}
                onChange={(e) => onAreaChange(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <option value="">请选择区域（可选）</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">如果不选择区域，器材将不归属于任何子区域</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              器材类型 *
            </label>
            {!isCustomType ? (
              <select
                value={newEquipmentType}
                onChange={(e) => {
                  onEquipmentTypeChange(e.target.value);
                  if (e.target.value === "其他") {
                    onToggleCustomType(true);
                  }
                }}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <option value="消火栓">消火栓</option>
                <option value="灭火器">灭火器</option>
                <option value="消防沙">消防沙</option>
                <option value="消防架">消防架</option>
                <option value="防汛">防汛</option>
                <option value="防寒">防寒</option>
                <option value="洗眼器">洗眼器</option>
                <option value="其他">其他（自定义）</option>
              </select>
            ) : (
              <input
                type="text"
                value={customType}
                onChange={(e) => onCustomTypeChange(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50"
                placeholder="请输入器材类型"
              />
            )}
            {isCustomType && (
              <button
                type="button"
                onClick={() => onToggleCustomType(false)}
                className="mt-2 text-sm text-emerald-600 hover:underline"
              >
                返回选择预置类型
              </button>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              器材编号 *
            </label>
            <input
              type="text"
              value={newEquipmentCode}
              onChange={(e) => onCodeChange(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50 hover:bg-gray-100 transition-colors"
              placeholder="请输入器材编号，如：XH-001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              器材包保责任人 *
            </label>
            <input
              type="text"
              value={newResponsiblePerson}
              onChange={(e) => onPersonChange(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50 hover:bg-gray-100 transition-colors"
              placeholder="请输入责任人姓名"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              onClick={onCreate}
              disabled={addingEquipment}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              {addingEquipment ? "添加中..." : "添加器材"}
            </button>
            <button
              onClick={onBack}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
