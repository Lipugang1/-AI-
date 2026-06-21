import React from "react";

interface EditRecordModalProps {
  editingRecord: {
    id: string;
    inspectionTime: string;
    inspectorName: string;
    photoKey?: string | null;
    aiResult?: string | null;
  };
  selectedEquipmentType: string;
  editingStatus: "良好" | "异常";
  editingRemarks: string;
  editingRecordLoading: boolean;
  editingHydrantFrontClear: "良好" | "异常" | "";
  editingHydrantBoxAppearance: "良好" | "异常" | "";
  editingHydrantSignage: "良好" | "异常" | "";
  editingHydrantNoLeakage: "良好" | "异常" | "";
  editingHydrantEquipmentComplete: "良好" | "异常" | "";
  editingHydrantHoseCondition: "良好" | "异常" | "";
  editingHydrantValveCondition: "良好" | "异常" | "";
  editingHydrantReelCondition: "良好" | "异常" | "";
  editingHydrantNozzleCondition: "良好" | "异常" | "";
  editingHydrantNoDebris: "良好" | "异常" | "";
  editingExtinguisherConfigCorrect: "良好" | "异常" | "";
  editingExtinguisherWithinExpiration: "良好" | "异常" | "";
  editingExtinguisherCylinderNormal: "良好" | "异常" | "";
  editingExtinguisherNozzleNormal: "良好" | "异常" | "";
  editingExtinguisherPipelineNormal: "良好" | "异常" | "";
  editingExtinguisherSealIntact: "良好" | "异常" | "";
  editingExtinguisherPressureNormal: "良好" | "异常" | "";
  editingExtinguisherCo2WeightNormal: "良好" | "异常" | "";
  editingSandNoCaking: "良好" | "异常" | "";
  onStatusChange: (status: "良好" | "异常") => void;
  onRemarksChange: (remarks: string) => void;
  onHydrantFrontClearChange: (val: "良好" | "异常" | "") => void;
  onHydrantBoxAppearanceChange: (val: "良好" | "异常" | "") => void;
  onHydrantSignageChange: (val: "良好" | "异常" | "") => void;
  onHydrantNoLeakageChange: (val: "良好" | "异常" | "") => void;
  onHydrantEquipmentCompleteChange: (val: "良好" | "异常" | "") => void;
  onHydrantHoseConditionChange: (val: "良好" | "异常" | "") => void;
  onHydrantValveConditionChange: (val: "良好" | "异常" | "") => void;
  onHydrantReelConditionChange: (val: "良好" | "异常" | "") => void;
  onHydrantNozzleConditionChange: (val: "良好" | "异常" | "") => void;
  onHydrantNoDebrisChange: (val: "良好" | "异常" | "") => void;
  onExtinguisherConfigCorrectChange: (val: "良好" | "异常" | "") => void;
  onExtinguisherWithinExpirationChange: (val: "良好" | "异常" | "") => void;
  onExtinguisherCylinderNormalChange: (val: "良好" | "异常" | "") => void;
  onExtinguisherNozzleNormalChange: (val: "良好" | "异常" | "") => void;
  onExtinguisherPipelineNormalChange: (val: "良好" | "异常" | "") => void;
  onExtinguisherSealIntactChange: (val: "良好" | "异常" | "") => void;
  onExtinguisherPressureNormalChange: (val: "良好" | "异常" | "") => void;
  onExtinguisherCo2WeightNormalChange: (val: "良好" | "异常" | "") => void;
  onSandNoCakingChange: (val: "良好" | "异常" | "") => void;
  onSave: () => void;
  onBack: () => void;
  onPhotoPreview: (recordId: string) => void;
}

export default function EditRecordModal({
  editingRecord,
  selectedEquipmentType,
  editingStatus,
  editingRemarks,
  editingRecordLoading,
  editingHydrantFrontClear,
  editingHydrantBoxAppearance,
  editingHydrantSignage,
  editingHydrantNoLeakage,
  editingHydrantEquipmentComplete,
  editingHydrantHoseCondition,
  editingHydrantValveCondition,
  editingHydrantReelCondition,
  editingHydrantNozzleCondition,
  editingHydrantNoDebris,
  editingExtinguisherConfigCorrect,
  editingExtinguisherWithinExpiration,
  editingExtinguisherCylinderNormal,
  editingExtinguisherNozzleNormal,
  editingExtinguisherPipelineNormal,
  editingExtinguisherSealIntact,
  editingExtinguisherPressureNormal,
  editingExtinguisherCo2WeightNormal,
  editingSandNoCaking,
  onStatusChange,
  onRemarksChange,
  onHydrantFrontClearChange,
  onHydrantBoxAppearanceChange,
  onHydrantSignageChange,
  onHydrantNoLeakageChange,
  onHydrantEquipmentCompleteChange,
  onHydrantHoseConditionChange,
  onHydrantValveConditionChange,
  onHydrantReelConditionChange,
  onHydrantNozzleConditionChange,
  onHydrantNoDebrisChange,
  onExtinguisherConfigCorrectChange,
  onExtinguisherWithinExpirationChange,
  onExtinguisherCylinderNormalChange,
  onExtinguisherNozzleNormalChange,
  onExtinguisherPipelineNormalChange,
  onExtinguisherSealIntactChange,
  onExtinguisherPressureNormalChange,
  onExtinguisherCo2WeightNormalChange,
  onSandNoCakingChange,
  onSave,
  onBack,
  onPhotoPreview,
}: EditRecordModalProps) {
  const renderSelect = (value: string, onChange: (v: any) => void, className?: string) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent ${className || "focus:ring-blue-500"}`}
    >
      <option value="">请选择</option>
      <option value="良好">良好</option>
      <option value="异常">异常</option>
    </select>
  );

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
        >
          返回
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          编辑巡查记录 - {selectedEquipmentType} ({editingRecord.id})
        </h2>

        <div className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>巡查时间：</strong>
              {new Date(editingRecord.inspectionTime).toLocaleString("zh-CN")}
            </p>
            <p className="text-sm text-gray-600">
              <strong>巡查人：</strong> {editingRecord.inspectorName}
            </p>
            {editingRecord.photoKey && (
              <button
                onClick={() => onPhotoPreview(editingRecord.id)}
                className="text-sm text-blue-600 hover:underline mt-2 block"
              >
                查看照片
              </button>
            )}
            {editingRecord.aiResult && (
              <div className="mt-2">
                <p className="text-sm font-semibold text-purple-900">AI 分析结果：</p>
                <pre className="text-sm text-purple-800 whitespace-pre-wrap">
                  {editingRecord.aiResult}
                </pre>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              巡查状态 *
            </label>
            <select
              value={editingStatus}
              onChange={(e) => onStatusChange(e.target.value as "良好" | "异常")}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="良好">良好</option>
              <option value="异常">异常</option>
            </select>
          </div>

          {selectedEquipmentType === "消火栓" && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-4">消火栓专项检查</h4>
              <div className="space-y-4">
                {[
                  { label: "消火栓前无杂物，箱门无锁闭 *", value: editingHydrantFrontClear, onChange: onHydrantFrontClearChange },
                  { label: "箱体外观正常，开度120°以上 *", value: editingHydrantBoxAppearance, onChange: onHydrantBoxAppearanceChange },
                  { label: "标识、流程图完好 *", value: editingHydrantSignage, onChange: onHydrantSignageChange },
                  { label: "消火栓无渗漏水 *", value: editingHydrantNoLeakage, onChange: onHydrantNoLeakageChange },
                  { label: "水带、水枪、按钮完好 *", value: editingHydrantEquipmentComplete, onChange: onHydrantEquipmentCompleteChange },
                  { label: "水带摆放整齐，无老化 *", value: editingHydrantHoseCondition, onChange: onHydrantHoseConditionChange },
                  { label: "水枪、接口、阀门完好 *", value: editingHydrantValveCondition, onChange: onHydrantValveConditionChange },
                  { label: "卷盘软管有序，无龟裂 *", value: editingHydrantReelCondition, onChange: onHydrantReelConditionChange },
                  { label: "枪头完好，连接紧固 *", value: editingHydrantNozzleCondition, onChange: onHydrantNozzleConditionChange },
                  { label: "消火栓内无杂物 *", value: editingHydrantNoDebris, onChange: onHydrantNoDebrisChange },
                ].map((item, idx) => (
                  <div key={idx}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {item.label}
                    </label>
                    {renderSelect(item.value, item.onChange)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedEquipmentType === "灭火器" && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-900 mb-4">灭火器专项检查</h4>
              <div className="space-y-4">
                {[
                  { label: "配置数量、型号正确 *", value: editingExtinguisherConfigCorrect, onChange: onExtinguisherConfigCorrectChange, focusRing: "focus:ring-red-500" },
                  { label: "在有效期内 *", value: editingExtinguisherWithinExpiration, onChange: onExtinguisherWithinExpirationChange },
                  { label: "筒体无锈蚀、变形等异常 *", value: editingExtinguisherCylinderNormal, onChange: onExtinguisherCylinderNormalChange },
                  { label: "喷嘴无堵塞、破损等异常 *", value: editingExtinguisherNozzleNormal, onChange: onExtinguisherNozzleNormalChange },
                  { label: "管路无老化、腐蚀等异常 *", value: editingExtinguisherPipelineNormal, onChange: onExtinguisherPipelineNormalChange },
                  { label: "铅封良好 *", value: editingExtinguisherSealIntact, onChange: onExtinguisherSealIntactChange },
                  { label: "压力表指针处于绿区（干粉） *", value: editingExtinguisherPressureNormal, onChange: onExtinguisherPressureNormalChange },
                  { label: "CO2称重合格（泄漏≤5%且≤50g） *", value: editingExtinguisherCo2WeightNormal, onChange: onExtinguisherCo2WeightNormalChange },
                ].map((item, idx) => (
                  <div key={idx}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {item.label}
                    </label>
                    {renderSelect(item.value, item.onChange, item.focusRing)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedEquipmentType === "消防沙" && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-semibold text-amber-900 mb-4">消防沙专项检查</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    铁锹翻动测试，无结块现象 *
                  </label>
                  {renderSelect(editingSandNoCaking, onSandNoCakingChange, "focus:ring-amber-500")}
                </div>
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              备注
            </label>
            <textarea
              value={editingRemarks}
              onChange={(e) => onRemarksChange(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入备注信息（可选）"
            />
          </div>

          <div className="flex gap-4">
            <button
              onClick={onSave}
              disabled={editingRecordLoading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {editingRecordLoading ? "保存中..." : "保存修改"}
            </button>
            <button
              onClick={onBack}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
