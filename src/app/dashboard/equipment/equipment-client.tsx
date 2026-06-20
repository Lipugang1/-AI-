"use client";

import { useState, useEffect } from "react";

interface Warehouse { [key: string]: any; id: string; teamId: string; name: string; }
interface Area { [key: string]: any; id: string; warehouseId: string; name: string; }
interface Team { [key: string]: any; id: string; name: string; }
interface FireEquipment { [key: string]: any; id: string; warehouseId: string; areaId: string | null; type: string; code: string; }
interface InspectionRecord { [key: string]: any; id: string; equipmentId: string; status: string; inspectionTime: string; inspectorName: string; }
interface InspectionRecord { id: string; equipmentId: string; photoKey: string | null; status: string; aiStatus: string | null; aiResult: string | null; inspectionTime: string; inspectorName: string; remarks: string | null; hydrantFrontClear?: string; hydrantBoxAppearance?: string; hydrantSignage?: string; hydrantNoLeakage?: string; hydrantEquipmentComplete?: string; hydrantHoseCondition?: string; hydrantValveCondition?: string; hydrantReelCondition?: string; hydrantFirection?: string; extinguisherConfigCorrect?: string; extinguisherWithinExpiration?: string; extinguisherCylinderNormal?: string; extinguisherNozzleNormal?: string; extinguisherPipelineNormal?: string; extinguisherSealIntact?: string; extinguisherPressureNormal?: string; extinguisherCo2WeightNormal?: string; sandNoCaking?: string; createdAt: string; }

interface TeamWithWarehouses extends Team {
  warehouses: Warehouse[];
}

interface EquipmentWithRecords extends FireEquipment {
  records?: InspectionRecord[];
}

// 月度检查类型
interface MonthlyCheck {
  id: string;
  warehouseId: string;
  areaId?: string;
  checkDate: string;
  inspectorName: string;
  photoKey?: string;
  photoUrl?: string;
  aiResult?: string;
  fireHazardRectification?: string;
  evacuationRoute?: string;
  fireTruckChannel?: string;
  fireEquipmentStatus?: string;
  microFireStationStatus?: string;
  electricalSafety?: string;
  keyPersonnelKnowledge?: string;
  keyAreasManagement?: string;
  hazardousMaterialSafety?: string;
  fireControlRoomStatus?: string;
  firePatrolStatus?: string;
  fireSafetySigns?: string;
  otherCheckItems?: string;
  overallConclusion: string;
  remarks?: string;
  createdAt: string;
}

// 月度检查12项配置
const MONTHLY_CHECK_ITEMS = [
  { key: "fireHazardRectification", label: "a) 火灾隐患的整改情况以及防范措施落实" },
  { key: "evacuationRoute", label: "b) 安全疏散通道、疏散指示标志、应急照明和安全出口情况" },
  { key: "fireTruckChannel", label: "c) 消防车通道、消防水源情况" },
  { key: "fireEquipmentStatus", label: "d) 灭火器材配置及有效情况" },
  { key: "microFireStationStatus", label: "d) 微型消防站配置及有效情况" },
  { key: "electricalSafety", label: "e) 用火、用电有无违章情况" },
  { key: "keyPersonnelKnowledge", label: "f) 消防重点工种人员消防知识的掌握情况" },
  { key: "keyAreasManagement", label: "g) 消防安全重点部位的管理情况" },
  { key: "hazardousMaterialSafety", label: "h) 易燃易爆危险物品和场所防火防爆措施的落实情况" },
  { key: "fireControlRoomStatus", label: "i) 消防(控制室)值班情况和设施运行、记录情况" },
  { key: "firePatrolStatus", label: "j) 防火巡查情况" },
  { key: "fireSafetySigns", label: "k) 消防安全标志的设置情况和完好、有效情况" },
  { key: "otherCheckItems", label: "l) 其他需要检查的内容" },
];

export function EquipmentClient() {
  const [teams, setTeams] = useState<TeamWithWarehouses[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<TeamWithWarehouses | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseCounts, setWarehouseCounts] = useState<Record<string, number>>({});
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [equipments, setEquipments] = useState<EquipmentWithRecords[]>([]);
  const [inspectionRecords, setInspectionRecords] = useState<InspectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<"list" | "inspection" | "records" | "addEquipment" | "editEquipment" | "editRecord">("list");
  
  // Tab切换状态
  const [activeTab, setActiveTab] = useState<"equipment" | "monthly">("equipment");
  
  // 月度检查相关状态
  const [monthlyChecks, setMonthlyChecks] = useState<MonthlyCheck[]>([]);
  const [currentMonthlyView, setCurrentMonthlyView] = useState<"list" | "add" | "detail">("list");
  const [selectedMonthlyCheck, setSelectedMonthlyCheck] = useState<MonthlyCheck | null>(null);
  const [monthlyCheckValues, setMonthlyCheckValues] = useState<Record<string, string>>({});
  const [monthlyCheckDate, setMonthlyCheckDate] = useState(new Date().toISOString().split("T")[0]);
  const [monthlyInspectorName, setMonthlyInspectorName] = useState("");
  const [monthlyConclusion, setMonthlyConclusion] = useState<"合格" | "不合格">("合格");
  const [monthlyRemarks, setMonthlyRemarks] = useState("");
  const [selectedMonthlyAreaId, setSelectedMonthlyAreaId] = useState<string>("");
  const [selectedMonthlyYearMonth, setSelectedMonthlyYearMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // 月度检查照片和AI状态（支持多张照片）
  const [monthlyPhotoFiles, setMonthlyPhotoFiles] = useState<File[]>([]);
  const [monthlyPhotoPreviews, setMonthlyPhotoPreviews] = useState<string[]>([]);
  const [monthlyAiResult, setMonthlyAiResult] = useState<string>("");
  const [monthlyAiLoading, setMonthlyAiLoading] = useState(false);

  // 区域管理状态
  const [showAreaManager, setShowAreaManager] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [editingAreaName, setEditingAreaName] = useState("");
  const [deletingAreaId, setDeletingAreaId] = useState<string | null>(null);
  const [newAreaName, setNewAreaName] = useState("");
  // 移动器材弹窗状态
  const [showMoveEquipmentModal, setShowMoveEquipmentModal] = useState(false);
  const [movingFromAreaId, setMovingFromAreaId] = useState<string | null>(null);
  const [movingToAreaId, setMovingToAreaId] = useState<string>("");
  const [movingEquipmentCount, setMovingEquipmentCount] = useState(0);
  const [movingMonthlyCheckCount, setMovingMonthlyCheckCount] = useState(0);

  // 巡查表单状态
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentWithRecords | null>(null);

  // 添加器材表单状态
  const [newEquipmentType, setNewEquipmentType] = useState<string>("消火栓");
  const [isCustomType, setIsCustomType] = useState(false);
  const [customType, setCustomType] = useState("");
  const [newEquipmentCode, setNewEquipmentCode] = useState("");
  const [newResponsiblePerson, setNewResponsiblePerson] = useState("");
  const [selectedAreaId, setSelectedAreaId] = useState<string>("");
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [addingEquipment, setAddingEquipment] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [status, setStatus] = useState<"良好" | "异常">("良好");
  const [remarks, setRemarks] = useState("");
  const [inspectorName, setInspectorName] = useState("");
  const [useCustomInspector, setUseCustomInspector] = useState(false);
  const [customInspectorName, setCustomInspectorName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<string>("");
  
  // 消火栓专项检查状态（详细标准）
  const [hydrantFrontClear, setHydrantFrontClear] = useState<"良好" | "异常">("良好");
  const [hydrantBoxAppearance, setHydrantBoxAppearance] = useState<"良好" | "异常">("良好");
  const [hydrantSignage, setHydrantSignage] = useState<"良好" | "异常">("良好");
  const [hydrantNoLeakage, setHydrantNoLeakage] = useState<"良好" | "异常">("良好");
  const [hydrantEquipmentComplete, setHydrantEquipmentComplete] = useState<"良好" | "异常">("良好");
  const [hydrantHoseCondition, setHydrantHoseCondition] = useState<"良好" | "异常">("良好");
  const [hydrantValveCondition, setHydrantValveCondition] = useState<"良好" | "异常">("良好");
  const [hydrantReelCondition, setHydrantReelCondition] = useState<"良好" | "异常">("良好");
  const [hydrantNozzleCondition, setHydrantNozzleCondition] = useState<"良好" | "异常">("良好");
  const [hydrantNoDebris, setHydrantNoDebris] = useState<"良好" | "异常">("良好");
  
  // 灭火器专项检查状态（详细标准）
  const [extinguisherConfigCorrect, setExtinguisherConfigCorrect] = useState<"良好" | "异常">("良好");
  const [extinguisherWithinExpiration, setExtinguisherWithinExpiration] = useState<"良好" | "异常">("良好");
  const [extinguisherCylinderNormal, setExtinguisherCylinderNormal] = useState<"良好" | "异常">("良好");
  const [extinguisherNozzleNormal, setExtinguisherNozzleNormal] = useState<"良好" | "异常">("良好");
  const [extinguisherPipelineNormal, setExtinguisherPipelineNormal] = useState<"良好" | "异常">("良好");
  const [extinguisherSealIntact, setExtinguisherSealIntact] = useState<"良好" | "异常">("良好");
  const [extinguisherPressureNormal, setExtinguisherPressureNormal] = useState<"良好" | "异常">("良好");
  const [extinguisherCo2WeightNormal, setExtinguisherCo2WeightNormal] = useState<"良好" | "异常">("良好");

  // 消防沙专项检查状态
  const [sandNoCaking, setSandNoCaking] = useState<"良好" | "异常">("良好");

  // 编辑器材状态
  const [editingEquipment, setEditingEquipment] = useState<FireEquipment | null>(null);
  const [editingEquipmentType, setEditingEquipmentType] = useState<string>("");
  const [editingIsCustomType, setEditingIsCustomType] = useState(false);
  const [editingCustomType, setEditingCustomType] = useState("");
  const [editingEquipmentCode, setEditingEquipmentCode] = useState("");
  const [editingResponsiblePerson, setEditingResponsiblePerson] = useState("");
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [editingEquipmentLoading, setEditingEquipmentLoading] = useState(false);

  // 编辑记录状态
  const [editingRecord, setEditingRecord] = useState<InspectionRecord | null>(null);
  const [editingStatus, setEditingStatus] = useState<"良好" | "异常">("良好");
  const [editingRemarks, setEditingRemarks] = useState("");
  const [editingInspectorName, setEditingInspectorName] = useState("");
  
  // 消火栓专项检查编辑状态
  const [editingHydrantFrontClear, setEditingHydrantFrontClear] = useState<"良好" | "异常" | "">("");
  const [editingHydrantBoxAppearance, setEditingHydrantBoxAppearance] = useState<"良好" | "异常" | "">("");
  const [editingHydrantSignage, setEditingHydrantSignage] = useState<"良好" | "异常" | "">("");
  const [editingHydrantNoLeakage, setEditingHydrantNoLeakage] = useState<"良好" | "异常" | "">("");
  const [editingHydrantEquipmentComplete, setEditingHydrantEquipmentComplete] = useState<"良好" | "异常" | "">("");
  const [editingHydrantHoseCondition, setEditingHydrantHoseCondition] = useState<"良好" | "异常" | "">("");
  const [editingHydrantValveCondition, setEditingHydrantValveCondition] = useState<"良好" | "异常" | "">("");
  const [editingHydrantReelCondition, setEditingHydrantReelCondition] = useState<"良好" | "异常" | "">("");
  const [editingHydrantNozzleCondition, setEditingHydrantNozzleCondition] = useState<"良好" | "异常" | "">("");
  const [editingHydrantNoDebris, setEditingHydrantNoDebris] = useState<"良好" | "异常" | "">("");
  
  // 灭火器专项检查编辑状态
  const [editingExtinguisherConfigCorrect, setEditingExtinguisherConfigCorrect] = useState<"良好" | "异常" | "">("");
  const [editingExtinguisherWithinExpiration, setEditingExtinguisherWithinExpiration] = useState<"良好" | "异常" | "">("");
  const [editingExtinguisherCylinderNormal, setEditingExtinguisherCylinderNormal] = useState<"良好" | "异常" | "">("");
  const [editingExtinguisherNozzleNormal, setEditingExtinguisherNozzleNormal] = useState<"良好" | "异常" | "">("");
  const [editingExtinguisherPipelineNormal, setEditingExtinguisherPipelineNormal] = useState<"良好" | "异常" | "">("");
  const [editingExtinguisherSealIntact, setEditingExtinguisherSealIntact] = useState<"良好" | "异常" | "">("");
  const [editingExtinguisherPressureNormal, setEditingExtinguisherPressureNormal] = useState<"良好" | "异常" | "">("");
  const [editingExtinguisherCo2WeightNormal, setEditingExtinguisherCo2WeightNormal] = useState<"良好" | "异常" | "">("");
  
  // 消防沙专项检查编辑状态
  const [editingSandNoCaking, setEditingSandNoCaking] = useState<"良好" | "异常" | "">("");
  
  const [editingRecordLoading, setEditingRecordLoading] = useState(false);

  // 导出功能状态
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportWarehouseId, setExportWarehouseId] = useState<string>("");
  const [exportAreaId, setExportAreaId] = useState<string>("");
  const [exportEquipmentType, setExportEquipmentType] = useState<string>("");
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [exporting, setExporting] = useState(false);

  // 器材定位状态（返回时恢复位置）
  const [lastSelectedEquipmentId, setLastSelectedEquipmentId] = useState<string>("");
  // 保存搜索关键字（返回时恢复搜索状态）
  const [savedSearchKeyword, setSavedSearchKeyword] = useState<string>("");
  // 图片预览状态（用于查看照片模态框）
  const [previewPhotoRecordId, setPreviewPhotoRecordId] = useState<string>("");
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string>("");

  // 初始化数据
  useEffect(() => {
    initializeData();
  }, []);

  // 监听 selectedWarehouse 变化，加载 areas 和 monthlyChecks
  useEffect(() => {
    if (selectedWarehouse) {
      loadAreas(selectedWarehouse.id);
      loadMonthlyChecks(selectedWarehouse.id);
    }
  }, [selectedWarehouse]);

  const initializeData = async () => {
    try {
      // 先初始化物资库数据
      await fetch("/api/warehouses/init", { credentials: 'include', method: "POST" });
      // 初始化班组数据
      await fetch("/api/teams/init", { credentials: 'include', method: "POST" });
      // 加载班组数据
      await loadTeams();
      // 加载全部仓库用以统计各班组仓库数量
      await loadAllWarehousesForCounts();
    } catch (error) {
      console.error("初始化数据失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllWarehousesForCounts = async () => {
    try {
      const response = await fetch("/api/warehouses", { credentials: 'include' });
      const data = await response.json();
      const warehousesList: any[] = data.warehouses || (data.success ? data.data : []);
      const counts: Record<string, number> = {};
      warehousesList.forEach((wh: any) => {
        const tid = wh.teamId || wh.team_id;
        if (tid) counts[tid] = (counts[tid] || 0) + 1;
      });
      setWarehouseCounts(counts);
    } catch (e) {
      console.error("加载仓库统计失败:", e);
    }
  };

  const loadTeams = async () => {
    const response = await fetch("/api/teams", { credentials: 'include' });
    const data = await response.json();
    if (data.teams) setTeams(data.teams);
    else if (data.success) setTeams(data.data);
  };

  const loadWarehouses = async (teamId?: string) => {
    let url = "/api/warehouses";
    if (teamId) url += `?teamId=${teamId}`;
    const response = await fetch(url, { credentials: 'include' });
    const data = await response.json();
    if (data.warehouses) setWarehouses(data.warehouses);
    else if (data.success) setWarehouses(data.data);
  };

  const loadEquipments = async (warehouseId: string, areaId?: string) => {
    let url = `/api/equipment?warehouseId=${warehouseId}`;
    if (areaId) url += `&areaId=${areaId}`;
    const response = await fetch(url, { credentials: 'include' });
    const data = await response.json();
    if (data.equipment) setEquipments(data.equipment);
    else if (data.success) setEquipments(data.data);
  };

  const loadAreas = async (warehouseId: string) => {
    const response = await fetch(`/api/areas?warehouseId=${warehouseId}`, { credentials: 'include' });
    const data = await response.json();
    if (data.areas) setAreas(data.areas);
    else if (data.success) setAreas(data.data);
  };

  const loadRecords = async (equipmentId: string) => {
    const response = await fetch(`/api/inspection?equipmentId=${equipmentId}`, { credentials: 'include' });
    const data = await response.json();
    if (data.records) setInspectionRecords(data.records);
    else if (data.success) setInspectionRecords(data.data);
  };

  // 加载月度检查记录
  const loadMonthlyChecks = async (warehouseId: string) => {
    const response = await fetch(`/api/monthly-check?warehouseId=${warehouseId}`, { credentials: 'include' });
    const data = await response.json();
    if (data.checks) setMonthlyChecks(data.checks);
    else if (data.success) setMonthlyChecks(data.data);
    const checks = data.checks || data.data || [];
    if (checks.length > 0) {
      const months = new Set<string>();
      checks.forEach((check: MonthlyCheck) => {
        const date = new Date(check.checkDate);
        const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        months.add(yearMonth);
      });
      const sortedMonths = Array.from(months).sort((a, b) => b.localeCompare(a));
      if (!months.has(selectedMonthlyYearMonth) && sortedMonths.length > 0) {
        setSelectedMonthlyYearMonth(sortedMonths[0]);
      }
    }
  };

  // 处理月度检查照片上传（支持多张）
  const handleMonthlyPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      setMonthlyPhotoFiles(prev => [...prev, ...newFiles]);
      
      // 为每个文件创建预览
      newFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setMonthlyPhotoPreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
    // 重置input以允许选择相同文件
    e.target.value = '';
  };

  // 删除单张照片
  const removeMonthlyPhoto = (index: number) => {
    setMonthlyPhotoFiles(prev => prev.filter((_, i) => i !== index));
    setMonthlyPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // 月度检查AI分析（分析所有照片）
  const analyzeMonthlyPhotos = async () => {
    if (monthlyPhotoFiles.length === 0) {
      alert("请先上传照片");
      return;
    }
    
    setMonthlyAiLoading(true);
    setMonthlyAiResult("");
    
    try {
      const results: string[] = [];
      
      for (let i = 0; i < monthlyPhotoFiles.length; i++) {
        const file = monthlyPhotoFiles[i];
        
        // 上传照片
        const formData = new FormData();
        formData.append("file", file);
        formData.append("warehouseId", selectedWarehouse?.id || "");
        
        const uploadRes = await fetch("/api/upload", { credentials: 'include', 
          method: "POST",
          body: formData,
        });
        
        if (!uploadRes.ok) {
          results.push(`照片${i + 1}: 上传失败`);
          continue;
        }
        
        const uploadData = await uploadRes.json();
        const photoUrl = uploadData.data?.photoUrl;
        
        if (!photoUrl) {
          results.push(`照片${i + 1}: 上传失败 - 未获取到图片URL`);
          continue;
        }
        
        // AI分析 - 添加超时控制
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 35000);
        
        try {
          const aiRes = await fetch("/api/ai-analyze", { credentials: 'include', 
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageUrl: photoUrl,
              equipmentType: "月度防火检查",
            }),
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          if (aiRes.ok) {
            const aiData = await aiRes.json();
            // API返回 { success, data: { aiStatus, aiResult, reason, suggestion } }
            const result = aiData.data?.aiResult || aiData.result || "分析完成";
            const status = aiData.data?.aiStatus || "";
            results.push(`照片${i + 1}: 状态【${status}】\n${result}`);
            
            // 如果AI发现异常，自动设置为不合格
            if (status === "异常" || result.includes("异常") || result.includes("隐患") || result.includes("不合格")) {
              setMonthlyConclusion("不合格");
            }
          } else {
            const errData = await aiRes.json();
            results.push(`照片${i + 1}: AI分析失败 - ${errData.message || "未知错误"}`);
          }
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          if (fetchError.name === 'AbortError') {
            results.push(`照片${i + 1}: AI分析超时，跳过`);
          } else {
            results.push(`照片${i + 1}: AI分析失败 - ${fetchError.message || "未知错误"}`);
          }
        }
      }
      
      const combinedResult = results.join("\n");
      setMonthlyAiResult(combinedResult);
      
      // 将AI建议添加到备注
      if (combinedResult.includes("异常") || combinedResult.includes("隐患")) {
        setMonthlyRemarks(prev => prev ? `${prev}\n\nAI分析结果:\n${combinedResult}` : `AI分析结果:\n${combinedResult}`);
      }
      
    } catch (error) {
      console.error("月度检查AI分析错误:", error);
      setMonthlyAiResult("AI分析出错，请手动检查");
    } finally {
      setMonthlyAiLoading(false);
    }
  };

  // 提交月度检查
  const submitMonthlyCheck = async () => {
    if (!selectedWarehouse || !monthlyInspectorName) {
      alert("请填写检查人姓名");
      return;
    }

    if (monthlyPhotoFiles.length === 0) {
      alert("请至少上传一张检查照片");
      return;
    }

    setUploading(true);
    try {
      // 如果有照片，先上传所有照片
      let photoKey = "";
      let photoUrl = "";

      if (monthlyPhotoFiles.length > 0) {
        // 上传第一张照片作为主照片
        const formData = new FormData();
        formData.append("file", monthlyPhotoFiles[0]);
        formData.append("warehouseId", selectedWarehouse.id);

        const uploadRes = await fetch("/api/upload", { credentials: 'include', 
          method: "POST",
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          photoKey = uploadData.data?.fileKey || "";
          photoUrl = uploadData.data?.photoUrl || "";
        }
      }

      const response = await fetch("/api/monthly-check", { credentials: 'include', 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId: selectedWarehouse.id,
          areaId: selectedMonthlyAreaId,
          checkDate: monthlyCheckDate,
          inspectorName: monthlyInspectorName,
          overallConclusion: monthlyConclusion,
          remarks: monthlyRemarks,
          photoKey,
          photoUrl,
          aiResult: monthlyAiResult,
          ...monthlyCheckValues,
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert("提交成功！");
        // 重置照片和AI状态
        setMonthlyPhotoFiles([]);
        setMonthlyPhotoPreviews([]);
        setMonthlyAiResult("");
        loadMonthlyChecks(selectedWarehouse.id);
        setCurrentMonthlyView("list");
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error("提交失败:", error);
      alert("提交失败，请重试");
    } finally {
      setUploading(false);
    }
  };

  // 删除月度检查记录
  const deleteMonthlyCheck = async (check: MonthlyCheck) => {
    if (!confirm("确定要删除这条检查记录吗？")) return;

    try {
      const response = await fetch(`/api/monthly-check/${check.id}`, { credentials: 'include', 
        method: "DELETE",
      });
      const data = await response.json();
      if (data.success) {
        alert("删除成功！");
        loadMonthlyChecks(selectedWarehouse!.id);
      }
    } catch (error) {
      console.error("删除失败:", error);
      alert("删除失败");
    }
  };

  // 获取本周一的日期（周一为每周第一天）
  const getMondayOfCurrentWeek = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay(); // 0=周日, 1=周一, ..., 6=周六
    const diff = day === 0 ? -6 : 1 - day; // 计算到周一的天数差
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0); // 设为当天0点
    return d;
  };

  // 检查日期是否在本周内（周一到周日）
  const isInCurrentWeek = (date: Date, now: Date): boolean => {
    const monday = getMondayOfCurrentWeek(now);
    const nextMonday = new Date(monday);
    nextMonday.setDate(nextMonday.getDate() + 7);
    return date >= monday && date < nextMonday;
  };

  // 检查每周巡查的预警逻辑（按日历周期：每周一预警）
  const checkWeeklyWarning = (equipment: EquipmentWithRecords): boolean => {
    const now = new Date();
    
    // 如果没有任何记录，需要预警
    if (!equipment.records || equipment.records.length === 0) {
      return true;
    }
    
    // 获取最新巡查记录的时间
    const latestRecord = equipment.records[0];
    if (!latestRecord) return true;
    const recordDate = new Date(latestRecord.inspectionTime);
    
    // 检查最新记录是否在本周内
    // 如果在本周内，说明本周已巡查，不预警
    // 如果不在本周内（上周或更早），说明本周未巡查，需要预警
    return !isInCurrentWeek(recordDate, now);
  };

  // 判断器材是否需要预警（在巡查时间段内且未巡查）
  const shouldShowWarning = (equipment: EquipmentWithRecords): boolean => {
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // 洗眼器：每周巡查一次（按日历周期，每周一预警）
    if (equipment.type === "洗眼器") {
      return checkWeeklyWarning(equipment);
    }

    // 防汛物资：6月-9月每周巡查一次，其他月份每月巡查一次
    if (equipment.type === "防汛") {
      const isWeeklyPeriod = currentMonth >= 5 && currentMonth <= 8; // 6月-9月 (getMonth: 5-8)
      
      if (isWeeklyPeriod) {
        // 每周巡查（按日历周期，每周一预警）
        return checkWeeklyWarning(equipment);
      } else {
        // 每月巡查，和其他消防器材一样
        return checkMonthlyWarning(equipment, now);
      }
    }

    // 防寒物资：12月-次年3月每周巡查一次，其他月份每月巡查一次
    if (equipment.type === "防寒") {
      const isWeeklyPeriod = currentMonth === 11 || (currentMonth >= 0 && currentMonth <= 2); // 12月-次年3月 (getMonth: 11, 0-2)
      
      if (isWeeklyPeriod) {
        // 每周巡查（按日历周期，每周一预警）
        return checkWeeklyWarning(equipment);
      } else {
        // 每月巡查，和其他消防器材一样
        return checkMonthlyWarning(equipment, now);
      }
    }

    // 其他消防器材：按月巡查
    return checkMonthlyWarning(equipment, now);
  };

  // 检查每月巡查的预警逻辑
  const checkMonthlyWarning = (equipment: EquipmentWithRecords, now: Date): boolean => {
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // 判断是否在杂品库
    const isZapinku = equipment.areaId && areas.find(a => a.id === equipment.areaId)?.name === "杂品库";

    // 判断当前日期是否在应该巡查的时间段内
    let inInspectionPeriod = false;
    if (isZapinku) {
      // 杂品库：5-10日或20-25日
      inInspectionPeriod = (currentDay >= 5 && currentDay <= 10) || (currentDay >= 20 && currentDay <= 25);
    } else {
      // 其他区域：20-25日
      inInspectionPeriod = currentDay >= 20 && currentDay <= 25;
    }

    if (!inInspectionPeriod) {
      return false;
    }

    // 检查是否在当前时间段内已有巡查记录
    if (!equipment.records || equipment.records.length === 0) {
      return true; // 没有任何记录，需要预警
    }

    // 检查最近一条记录是否在当前时间段内
    const latestRecord = equipment.records[0]; // records 应该按时间降序排列
    if (!latestRecord) {
      return true;
    }

    const recordDate = new Date(latestRecord.inspectionTime);
    const recordDay = recordDate.getDate();
    const recordMonth = recordDate.getMonth();
    const recordYear = recordDate.getFullYear();

    // 检查记录是否在同月
    if (recordYear !== currentYear || recordMonth !== currentMonth) {
      return true; // 记录不在同月，需要预警
    }

    // 检查记录是否在当前时间段内
    let recordInPeriod = false;
    if (isZapinku) {
      // 杂品库：5-10日或20-25日
      recordInPeriod = (recordDay >= 5 && recordDay <= 10) || (recordDay >= 20 && recordDay <= 25);
    } else {
      // 其他区域：20-25日
      recordInPeriod = recordDay >= 20 && recordDay <= 25;
    }

    // 如果记录在当前时间段内，不需要预警；否则需要预警
    return !recordInPeriod;
  };

  // 获取预警提示文字
  const getWarningText = (equipment: EquipmentWithRecords): string => {
    const now = new Date();
    const currentMonth = now.getMonth();

    if (equipment.type === "洗眼器") {
      return "本周未巡查";
    }

    if (equipment.type === "防汛") {
      const isWeeklyPeriod = currentMonth >= 5 && currentMonth <= 8; // 6月-9月
      return isWeeklyPeriod ? "本周未巡查" : "需要立即巡查";
    }

    if (equipment.type === "防寒") {
      const isWeeklyPeriod = currentMonth === 11 || (currentMonth >= 0 && currentMonth <= 2); // 12月-次年3月
      return isWeeklyPeriod ? "本周未巡查" : "需要立即巡查";
    }

    return "需要立即巡查";
  };

  const handleWarehouseSelect = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setSelectedArea(null);
    loadAreas(warehouse.id);
    loadEquipments(warehouse.id);
    loadMonthlyChecks(warehouse.id);
    setCurrentView("list");
  };

  const handleAreaSelect = (area: Area | null) => {
    setSelectedArea(area);
    loadEquipments(selectedWarehouse!.id, area?.id);
  };

  const handleInspect = (equipment: EquipmentWithRecords) => {
    // 保存当前位置（用于返回时恢复）
    setLastSelectedEquipmentId(equipment.id);
    setSavedSearchKeyword(searchKeyword);
    setSelectedEquipment(equipment);
    setCurrentView("inspection");
    loadRecords(equipment.id);
    // 重置表单
    setPhotoFile(null);
    setPhotoPreview("");
    setStatus("良好");
    setRemarks("");
    setInspectorName(equipment.responsiblePerson || "");
    setUseCustomInspector(false);
    setCustomInspectorName("");
    setAiResult("");
    
    // 重置消火栓检查项
    setHydrantFrontClear("良好");
    setHydrantBoxAppearance("良好");
    setHydrantSignage("良好");
    setHydrantNoLeakage("良好");
    setHydrantEquipmentComplete("良好");
    setHydrantHoseCondition("良好");
    setHydrantValveCondition("良好");
    setHydrantReelCondition("良好");
    setHydrantNozzleCondition("良好");
    setHydrantNoDebris("良好");
    
    // 重置灭火器检查项
    setExtinguisherConfigCorrect("良好");
    setExtinguisherWithinExpiration("良好");
    setExtinguisherCylinderNormal("良好");
    setExtinguisherNozzleNormal("良好");
    setExtinguisherPipelineNormal("良好");
    setExtinguisherSealIntact("良好");
    setExtinguisherPressureNormal("良好");
    setExtinguisherCo2WeightNormal("良好");
  };

  const handleViewRecords = (equipment: EquipmentWithRecords) => {
    // 保存当前位置
    setLastSelectedEquipmentId(equipment.id);
    setSavedSearchKeyword(searchKeyword);
    setSelectedEquipment(equipment);
    setCurrentView("records");
    loadRecords(equipment.id);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleAIAnalyze = async () => {
    if (!photoPreview || !selectedEquipment) return;

    setAiAnalyzing(true);
    try {
      // 先上传图片获取 URL（带水印）
      const formData = new FormData();
      formData.append("file", photoFile!);
      formData.append("warehouseName", selectedWarehouse?.name || "");
      formData.append("equipmentCode", selectedEquipment.code);
      formData.append("inspectorName", inspectorName || "");

      const uploadResponse = await fetch("/api/upload", { credentials: 'include', 
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadResponse.json();

      if (!uploadData.success) {
        throw new Error("上传图片失败");
      }

      // AI 分析 - 添加超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000); // 35秒超时

      try {
        const analyzeResponse = await fetch("/api/ai-analyze", { credentials: 'include', 
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: uploadData.data.photoUrl,
            equipmentType: selectedEquipment.type,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const analyzeData = await analyzeResponse.json();

        if (analyzeData.success) {
          setAiResult(analyzeData.data.aiResult);
          setStatus(analyzeData.data.aiStatus as "良好" | "异常");
          if (analyzeData.data.suggestion && !remarks) {
            setRemarks(analyzeData.data.suggestion);
          }
        } else {
          // AI分析返回失败，但图片已上传成功
          console.warn("AI 分析返回失败:", analyzeData.message);
          setAiResult(`AI分析暂不可用，请手动判断。原因：${analyzeData.message || '未知错误'}`);
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.warn("AI 分析超时");
          setAiResult("AI 分析超时，请手动判断器材状态");
        } else {
          throw fetchError;
        }
      }
    } catch (error) {
      console.error("AI 分析失败:", error);
      setAiResult("AI 分析失败，请手动判断器材状态");
    } finally {
      setAiAnalyzing(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedEquipment || !inspectorName) {
      alert("请填写巡查人姓名");
      return;
    }

    // 确定最终使用的巡查人姓名
    const finalInspectorName = useCustomInspector ? customInspectorName : inspectorName;
    if (!finalInspectorName) {
      alert("请填写巡查人姓名");
      return;
    }

    // 如果是消火栓，检查必填项
    if (selectedEquipment.type === "消火栓") {
      if (!hydrantFrontClear || !hydrantBoxAppearance || !hydrantSignage || 
          !hydrantNoLeakage || !hydrantEquipmentComplete || !hydrantHoseCondition ||
          !hydrantValveCondition || !hydrantReelCondition || !hydrantNozzleCondition || !hydrantNoDebris) {
        alert("请完成消火栓专项检查项");
        return;
      }
    }

    // 如果是灭火器，检查必填项
    if (selectedEquipment.type === "灭火器") {
      if (!extinguisherConfigCorrect || !extinguisherWithinExpiration || !extinguisherCylinderNormal ||
          !extinguisherNozzleNormal || !extinguisherPipelineNormal || !extinguisherSealIntact ||
          !extinguisherPressureNormal || !extinguisherCo2WeightNormal) {
        alert("请完成灭火器专项检查项");
        return;
      }
    }

    setUploading(true);
    try {
      // 上传图片（带水印）
      let photoKey = "";
      let photoUrl = "";
      if (photoFile) {
        const formData = new FormData();
        formData.append("file", photoFile);
        formData.append("warehouseName", selectedWarehouse?.name || "");
        formData.append("equipmentCode", selectedEquipment.code);
        formData.append("inspectorName", finalInspectorName);

        const uploadResponse = await fetch("/api/upload", { credentials: 'include', 
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadResponse.json();

        if (uploadData.success) {
          photoKey = uploadData.data.fileKey;
          photoUrl = uploadData.data.photoUrl;
        }
      }

      // 创建巡查记录
      const requestBody: any = {
        equipmentId: selectedEquipment.id,
        photoKey,
        status,
        aiStatus: aiResult ? status : null,
        aiResult: aiResult || null,
        inspectionTime: new Date().toISOString(),
        inspectorName: finalInspectorName,
        remarks,
      };

      // 如果是消火栓，添加专项检查项
      if (selectedEquipment.type === "消火栓") {
        requestBody.hydrantFrontClear = hydrantFrontClear;
        requestBody.hydrantBoxAppearance = hydrantBoxAppearance;
        requestBody.hydrantSignage = hydrantSignage;
        requestBody.hydrantNoLeakage = hydrantNoLeakage;
        requestBody.hydrantEquipmentComplete = hydrantEquipmentComplete;
        requestBody.hydrantHoseCondition = hydrantHoseCondition;
        requestBody.hydrantValveCondition = hydrantValveCondition;
        requestBody.hydrantReelCondition = hydrantReelCondition;
        requestBody.hydrantNozzleCondition = hydrantNozzleCondition;
        requestBody.hydrantNoDebris = hydrantNoDebris;
      }

      // 如果是灭火器，添加专项检查项
      if (selectedEquipment.type === "灭火器") {
        requestBody.extinguisherConfigCorrect = extinguisherConfigCorrect;
        requestBody.extinguisherWithinExpiration = extinguisherWithinExpiration;
        requestBody.extinguisherCylinderNormal = extinguisherCylinderNormal;
        requestBody.extinguisherNozzleNormal = extinguisherNozzleNormal;
        requestBody.extinguisherPipelineNormal = extinguisherPipelineNormal;
        requestBody.extinguisherSealIntact = extinguisherSealIntact;
        requestBody.extinguisherPressureNormal = extinguisherPressureNormal;
        requestBody.extinguisherCo2WeightNormal = extinguisherCo2WeightNormal;
      }

      const response = await fetch("/api/inspection", { credentials: 'include', 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        alert("巡查记录保存成功！");
        // 重新加载器材列表以更新预警状态
        loadEquipments(selectedWarehouse!.id, selectedArea?.id);
        // 返回列表视图
        setCurrentView("list");
      } else {
        throw new Error(data.message || "保存失败");
      }
    } catch (error) {
      console.error("保存失败:", error);
      alert("保存失败，请重试");
    } finally {
      setUploading(false);
    }
  };

  const handleAddEquipment = async () => {
    const equipmentType = isCustomType ? customType : newEquipmentType;

    if (!selectedWarehouse || !equipmentType || !newEquipmentCode || !newResponsiblePerson) {
      alert("请填写完整的器材信息（包括责任人）");
      return;
    }

    setAddingEquipment(true);
    try {
      const requestBody: any = {
        warehouseId: selectedWarehouse.id,
        type: equipmentType,
        code: newEquipmentCode,
        responsiblePerson: newResponsiblePerson,
      };

      // 如果有选择区域，添加areaId
      if (selectedAreaId) {
        requestBody.areaId = selectedAreaId;
      }

      const response = await fetch("/api/equipment", { credentials: 'include', 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        alert("消防器材添加成功！");
        setNewEquipmentType("消火栓");
        setIsCustomType(false);
        setCustomType("");
        setNewEquipmentCode("");
        setNewResponsiblePerson("");
        setSelectedAreaId("");
        setCurrentView("list");
        loadEquipments(selectedWarehouse.id, selectedArea?.id);
      } else {
        throw new Error(data.message || "添加失败");
      }
    } catch (error) {
      console.error("添加器材失败:", error);
      alert("添加失败，请重试");
    } finally {
      setAddingEquipment(false);
    }
  };

  // 删除器材
  const handleDeleteEquipment = async (equipment: FireEquipment) => {
    if (!confirm(`确定要删除器材 "${equipment.type} (${equipment.code})" 吗？`)) {
      return;
    }

    try {
      const response = await fetch(`/api/equipment/${equipment.id}`, { credentials: 'include', 
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        alert("删除成功！");
        loadEquipments(selectedWarehouse!.id, selectedArea?.id);
      } else {
        throw new Error(data.message || "删除失败");
      }
    } catch (error) {
      console.error("删除器材失败:", error);
      alert("删除失败，请重试");
    }
  };

  // 编辑器材
  const handleEditEquipment = (equipment: FireEquipment) => {
    setEditingEquipment(equipment);
    setEditingEquipmentType(equipment.type);
    setEditingEquipmentCode(equipment.code);
    setEditingResponsiblePerson(equipment.responsiblePerson || "");
    setEditingAreaId(equipment.areaId || "");

    // 检查是否是自定义类型
    const predefinedTypes = ["消火栓", "灭火器", "消防沙", "消防架", "洗眼器"];
    if (!predefinedTypes.includes(equipment.type)) {
      setEditingIsCustomType(true);
      setEditingCustomType(equipment.type);
    } else {
      setEditingIsCustomType(false);
      setEditingCustomType("");
    }

    setCurrentView("editEquipment");
  };

  // 保存编辑的器材
  const handleSaveEditEquipment = async () => {
    if (!editingEquipment) return;

    const equipmentType = editingIsCustomType ? editingCustomType : editingEquipmentType;

    if (!equipmentType || !editingEquipmentCode || !editingResponsiblePerson) {
      alert("请填写完整的器材信息（包括责任人）");
      return;
    }

    setEditingEquipmentLoading(true);
    try {
      const response = await fetch(`/api/equipment/${editingEquipment.id}`, { credentials: 'include', 
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: equipmentType,
          code: editingEquipmentCode,
          responsiblePerson: editingResponsiblePerson,
          areaId: editingAreaId || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert("器材更新成功！");
        setEditingEquipment(null);
        setCurrentView("list");
        loadEquipments(selectedWarehouse!.id, selectedArea?.id);
      } else {
        throw new Error(data.message || "更新失败");
      }
    } catch (error) {
      console.error("更新器材失败:", error);
      alert("更新失败，请重试");
    } finally {
      setEditingEquipmentLoading(false);
    }
  };

  // 删除巡查记录
  const handleDeleteRecord = async (record: InspectionRecord) => {
    if (!confirm("确定要删除这条巡查记录吗？")) {
      return;
    }

    try {
      const response = await fetch(`/api/inspection/${record.id}`, { credentials: 'include', 
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        alert("删除成功！");
        loadRecords(selectedEquipment!.id);
      } else {
        throw new Error(data.message || "删除失败");
      }
    } catch (error) {
      console.error("删除记录失败:", error);
      alert("删除失败，请重试");
    }
  };

  // 编辑巡查记录
  const handleEditRecord = (record: InspectionRecord) => {
    setEditingRecord(record);
    setEditingStatus(record.status as "良好" | "异常");
    setEditingRemarks(record.remarks || "");
    setEditingInspectorName(record.inspectorName);
    
    // 消火栓检查项
    setEditingHydrantFrontClear((record.hydrantFrontClear === "正常" ? "良好" : record.hydrantFrontClear || "") as "良好" | "异常" | "");
    setEditingHydrantBoxAppearance((record.hydrantBoxAppearance === "正常" ? "良好" : record.hydrantBoxAppearance || "") as "良好" | "异常" | "");
    setEditingHydrantSignage((record.hydrantSignage === "正常" ? "良好" : record.hydrantSignage || "") as "良好" | "异常" | "");
    setEditingHydrantNoLeakage((record.hydrantNoLeakage === "正常" ? "良好" : record.hydrantNoLeakage || "") as "良好" | "异常" | "");
    setEditingHydrantEquipmentComplete((record.hydrantEquipmentComplete === "正常" ? "良好" : record.hydrantEquipmentComplete || "") as "良好" | "异常" | "");
    setEditingHydrantHoseCondition((record.hydrantHoseCondition === "正常" ? "良好" : record.hydrantHoseCondition || "") as "良好" | "异常" | "");
    setEditingHydrantValveCondition((record.hydrantValveCondition === "正常" ? "良好" : record.hydrantValveCondition || "") as "良好" | "异常" | "");
    setEditingHydrantReelCondition((record.hydrantReelCondition === "正常" ? "良好" : record.hydrantReelCondition || "") as "良好" | "异常" | "");
    setEditingHydrantNozzleCondition((record.hydrantNozzleCondition === "正常" ? "良好" : record.hydrantNozzleCondition || "") as "良好" | "异常" | "");
    setEditingHydrantNoDebris((record.hydrantNoDebris === "正常" ? "良好" : record.hydrantNoDebris || "") as "良好" | "异常" | "");
    
    // 灭火器检查项
    setEditingExtinguisherConfigCorrect((record.extinguisherConfigCorrect || "") as "良好" | "异常" | "");
    setEditingExtinguisherWithinExpiration((record.extinguisherWithinExpiration || "") as "良好" | "异常" | "");
    setEditingExtinguisherCylinderNormal((record.extinguisherCylinderNormal || "") as "良好" | "异常" | "");
    setEditingExtinguisherNozzleNormal((record.extinguisherNozzleNormal || "") as "良好" | "异常" | "");
    setEditingExtinguisherPipelineNormal((record.extinguisherPipelineNormal || "") as "良好" | "异常" | "");
    setEditingExtinguisherSealIntact((record.extinguisherSealIntact || "") as "良好" | "异常" | "");
    setEditingExtinguisherPressureNormal((record.extinguisherPressureNormal || "") as "良好" | "异常" | "");
    setEditingExtinguisherCo2WeightNormal((record.extinguisherCo2WeightNormal || "") as "良好" | "异常" | "");
    
    setCurrentView("editRecord");
  };

  // 保存编辑的巡查记录
  const handleSaveEditRecord = async () => {
    if (!editingRecord || !selectedEquipment) return;

    // 如果是消火栓，检查必填项
    if (selectedEquipment.type === "消火栓") {
      if (!editingHydrantFrontClear || !editingHydrantBoxAppearance || !editingHydrantSignage ||
          !editingHydrantNoLeakage || !editingHydrantEquipmentComplete || !editingHydrantHoseCondition ||
          !editingHydrantValveCondition || !editingHydrantReelCondition || !editingHydrantNozzleCondition || !editingHydrantNoDebris) {
        alert("请完成消火栓专项检查项");
        return;
      }
    }

    // 如果是灭火器，检查必填项
    if (selectedEquipment.type === "灭火器") {
      if (!editingExtinguisherConfigCorrect || !editingExtinguisherWithinExpiration || !editingExtinguisherCylinderNormal ||
          !editingExtinguisherNozzleNormal || !editingExtinguisherPipelineNormal || !editingExtinguisherSealIntact ||
          !editingExtinguisherPressureNormal || !editingExtinguisherCo2WeightNormal) {
        alert("请完成灭火器专项检查项");
        return;
      }
    }

    setEditingRecordLoading(true);
    try {
      const requestBody: any = {
        status: editingStatus,
        remarks: editingRemarks,
      };

      // 如果是消火栓，添加专项检查项
      if (selectedEquipment.type === "消火栓") {
        requestBody.hydrantFrontClear = editingHydrantFrontClear;
        requestBody.hydrantBoxAppearance = editingHydrantBoxAppearance;
        requestBody.hydrantSignage = editingHydrantSignage;
        requestBody.hydrantNoLeakage = editingHydrantNoLeakage;
        requestBody.hydrantEquipmentComplete = editingHydrantEquipmentComplete;
        requestBody.hydrantHoseCondition = editingHydrantHoseCondition;
        requestBody.hydrantValveCondition = editingHydrantValveCondition;
        requestBody.hydrantReelCondition = editingHydrantReelCondition;
        requestBody.hydrantNozzleCondition = editingHydrantNozzleCondition;
        requestBody.hydrantNoDebris = editingHydrantNoDebris;
      }

      // 如果是灭火器，添加专项检查项
      if (selectedEquipment.type === "灭火器") {
        requestBody.extinguisherConfigCorrect = editingExtinguisherConfigCorrect;
        requestBody.extinguisherWithinExpiration = editingExtinguisherWithinExpiration;
        requestBody.extinguisherCylinderNormal = editingExtinguisherCylinderNormal;
        requestBody.extinguisherNozzleNormal = editingExtinguisherNozzleNormal;
        requestBody.extinguisherPipelineNormal = editingExtinguisherPipelineNormal;
        requestBody.extinguisherSealIntact = editingExtinguisherSealIntact;
        requestBody.extinguisherPressureNormal = editingExtinguisherPressureNormal;
        requestBody.extinguisherCo2WeightNormal = editingExtinguisherCo2WeightNormal;
      }

      const response = await fetch(`/api/inspection/${editingRecord.id}`, { credentials: 'include', 
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        alert("记录更新成功！");
        setEditingRecord(null);
        setCurrentView("records");
        loadRecords(selectedEquipment!.id);
      } else {
        throw new Error(data.message || "更新失败");
      }
    } catch (error) {
      console.error("更新记录失败:", error);
      alert("更新失败，请重试");
    } finally {
      setEditingRecordLoading(false);
    }
  };

  // 导出巡查记录
  const handleExport = async () => {
    setExporting(true);
    try {
      // 构建查询参数
      const params = new URLSearchParams();
      if (exportWarehouseId) params.append("warehouseId", exportWarehouseId);
      if (exportAreaId) params.append("areaId", exportAreaId);
      if (exportEquipmentType) params.append("equipmentType", exportEquipmentType);
      if (exportStartDate) params.append("startDate", exportStartDate);
      if (exportEndDate) params.append("endDate", exportEndDate);

      // 调用导出 API
      const response = await fetch(`/api/export/inspection?${params.toString()}`, { credentials: 'include' });

      if (!response.ok) {
        throw new Error("导出失败");
      }

      // 下载文件
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `巡查记录_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      alert("导出成功！");
      setShowExportDialog(false);
    } catch (error) {
      console.error("导出失败:", error);
      alert("导出失败，请重试");
    } finally {
      setExporting(false);
    }
  };

  // 导出月度检查记录
  const handleExportMonthlyCheck = async () => {
    try {
      // 构建查询参数
      const params = new URLSearchParams();
      if (selectedWarehouse) params.append("warehouseId", selectedWarehouse.id);

      // 调用导出 API
      const response = await fetch(`/api/export/monthly-check?${params.toString()}`, { credentials: 'include' });

      if (!response.ok) {
        throw new Error("导出失败");
      }

      // 下载文件
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `月度防火检查记录_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      alert("导出成功！");
    } catch (error) {
      console.error("导出失败:", error);
      alert("导出失败，请重试");
    }
  };

  // 区域管理 - 更新区域名称
  const handleUpdateArea = async () => {
    if (!editingArea || !editingAreaName.trim()) return;
    try {
      const response = await fetch(`/api/areas/${editingArea.id}`, { credentials: 'include', 
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingAreaName.trim() }),
      });
      if (!response.ok) throw new Error("更新失败");
      
      // 刷新区域列表
      if (selectedWarehouse) {
        await loadAreas(selectedWarehouse.id);
      }
      setEditingArea(null);
      setEditingAreaName("");
      alert("区域名称已更新！");
    } catch (error) {
      console.error("更新区域失败:", error);
      alert("更新失败，请重试");
    }
  };

  // 区域管理 - 删除区域
  const handleDeleteArea = async (areaId: string) => {
    // 先检查区域下是否有器材和月度检查记录
    const equipmentInArea = equipments.filter(e => e.areaId === areaId);
    const monthlyChecksInArea = monthlyChecks.filter(c => c.areaId === areaId);

    if (equipmentInArea.length > 0 || monthlyChecksInArea.length > 0) {
      // 有器材或月度检查记录，显示移动弹窗
      setMovingFromAreaId(areaId);
      setMovingEquipmentCount(equipmentInArea.length);
      setMovingMonthlyCheckCount(monthlyChecksInArea.length);
      setMovingToAreaId("");
      setShowMoveEquipmentModal(true);
      return;
    }

    // 没有器材和月度检查记录，直接删除
    if (!confirm("确定要删除该区域吗？")) return;
    
    try {
      const response = await fetch(`/api/areas/${areaId}`, { credentials: 'include', 
        method: "DELETE",
      });
      if (!response.ok) throw new Error("删除失败");
      
      // 刷新区域列表和器材列表
      if (selectedWarehouse) {
        await loadAreas(selectedWarehouse.id);
        await loadEquipments(selectedWarehouse.id);
      }
      setDeletingAreaId(null);
      alert("区域已删除！");
    } catch (error) {
      console.error("删除区域失败:", error);
      alert("删除失败，请重试");
    }
  };

  // 批量移动器材到其他区域
  const handleMoveEquipments = async () => {
    if (!movingFromAreaId || !movingToAreaId) {
      alert("请选择目标区域");
      return;
    }

    if (movingToAreaId === movingFromAreaId) {
      alert("不能选择同一个区域");
      return;
    }

    try {
      // 获取源区域下的所有器材
      const equipmentToMove = equipments.filter(e => e.areaId === movingFromAreaId);

      // 批量更新器材的区域
      for (const equipment of equipmentToMove) {
        await fetch(`/api/equipment/${equipment.id}`, { credentials: 'include', 
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ areaId: movingToAreaId }),
        });
      }

      // 批量更新月度检查记录的区域
      if (movingMonthlyCheckCount > 0) {
        await fetch("/api/monthly-check/move-area", { credentials: 'include', 
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fromAreaId: movingFromAreaId, toAreaId: movingToAreaId }),
        });
      }

      // 删除源区域
      await fetch(`/api/areas/${movingFromAreaId}`, { credentials: 'include', 
        method: "DELETE",
      });

      // 刷新数据
      if (selectedWarehouse) {
        await loadAreas(selectedWarehouse.id);
        await loadEquipments(selectedWarehouse.id);
        await loadMonthlyChecks(selectedWarehouse.id);
      }

      setShowMoveEquipmentModal(false);
      setMovingFromAreaId(null);
      setMovingEquipmentCount(0);
      setMovingMonthlyCheckCount(0);
      const totalItems = equipmentToMove.length + movingMonthlyCheckCount;
      alert(`已移动 ${equipmentToMove.length} 个器材和 ${movingMonthlyCheckCount} 条月度检查记录到新区域，并删除原区域！`);
    } catch (error) {
      console.error("移动器材失败:", error);
      alert("操作失败，请重试");
    }
  };

  // 区域管理 - 保存区域编辑
  const handleSaveAreaEdit = async (areaId: string) => {
    if (!editingAreaName.trim()) {
      alert("区域名称不能为空");
      return;
    }
    try {
      const response = await fetch(`/api/areas/${areaId}`, { credentials: 'include', 
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingAreaName.trim() }),
      });
      if (!response.ok) throw new Error("更新失败");
      
      // 刷新区域列表
      if (selectedWarehouse) {
        loadAreas(selectedWarehouse.id);
      }
      setEditingAreaId(null);
      setEditingAreaName("");
    } catch (error) {
      console.error("更新区域失败:", error);
      alert("更新失败，请重试");
    }
  };

  // 区域管理 - 添加新区域
  const handleAddNewArea = async () => {
    if (!newAreaName.trim()) {
      alert("请输入区域名称");
      return;
    }
    if (!selectedWarehouse) {
      alert("请先选择物资库");
      return;
    }
    try {
      const response = await fetch("/api/areas", { credentials: 'include', 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAreaName.trim(),
          warehouseId: selectedWarehouse.id,
        }),
      });
      if (!response.ok) throw new Error("添加失败");
      
      // 刷新区域列表
      await loadAreas(selectedWarehouse.id);
      setNewAreaName("");
      alert("区域已添加！");
    } catch (error) {
      console.error("添加区域失败:", error);
      alert("添加失败，请重试");
    }
  };

  // 月度检查 - 区域点击
  const handleAreaMonthlyClick = (area: Area) => {
    setSelectedMonthlyAreaId(area.id);
    setMonthlyCheckDate(new Date().toISOString().split("T")[0]);
    setMonthlyInspectorName("");
    setMonthlyConclusion("合格");
    setMonthlyRemarks("");
    // 默认所有检查项为"合格"
    setMonthlyCheckValues({
      a: "合格", b: "合格", c: "合格", d: "合格",
      e: "合格", f: "合格", g: "合格", h: "合格",
      i: "合格", j: "合格", k: "合格", l: "合格"
    });
    setCurrentMonthlyView("add");
  };

  // 月度检查 - 查看详情
  const handleViewMonthlyDetail = async (check: MonthlyCheck) => {
    // 如果有 photoKey 但没有 photoUrl，尝试获取新的预签名 URL
    if ((check as any).photoKey && !(check as any).photoUrl) {
      try {
        const response = await fetch(`/api/presigned-url?key=${(check as any).photoKey}`, { credentials: 'include' });
        const data = await response.json();
        if (data.success && data.data?.photoUrl) {
          (check as any).photoUrl = data.data.photoUrl;
        }
      } catch (error) {
        console.error("获取预签名 URL 失败:", error);
      }
    }
    setSelectedMonthlyCheck(check);
    setCurrentMonthlyView("detail");
  };

  // 重置导出参数
  const resetExportParams = () => {
    setExportWarehouseId("");
    setExportAreaId("");
    setExportEquipmentType("");
    setExportStartDate("");
    setExportEndDate("");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50">
      {/* 顶部导航栏 */}
      <header className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white rounded-xl shadow-lg flex items-center justify-center overflow-hidden">
                <img src="/logo.png" alt="Logo" className="w-14 h-14 object-contain" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-wide">物资库消防（应急物资）AI巡查系统</h1>
                <p className="text-emerald-200 text-sm mt-1">青岛地铁 · 安全保障</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2 bg-emerald-800/50 px-4 py-2 rounded-full">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>青岛地铁运营线路</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* 页面标题 */}
        <div className="mb-8 text-center">
          <p className="text-gray-600 text-lg">请选择班组和物资库开始巡查</p>
        </div>

        {/* 班组选择 */}
        {!selectedTeam && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">
              <span className="inline-flex items-center gap-2">
                <span className="w-8 h-1 bg-emerald-500 rounded-full"></span>
                选择班组
                <span className="w-8 h-1 bg-emerald-500 rounded-full"></span>
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {teams.map((team, index) => (
                <button
                  key={team.id}
                  onClick={() => {
                    setSelectedTeam(team);
                    loadWarehouses(team.id);
                  }}
                  className="group relative bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-emerald-500 overflow-hidden"
                >
                  {/* 背景装饰 */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                  
                  {/* 序号 */}
                  <div className="absolute top-4 left-4 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold text-sm">
                    {index + 1}
                  </div>
                  
                  <div className="relative">
                    <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-emerald-700 transition-colors">{team.name}</h3>
                    <div className="flex items-center gap-2 text-gray-500">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span>{warehouseCounts[team.id] || 0} 个物资库</span>
                    </div>
                    <div className="mt-4 flex items-center text-emerald-600 font-medium">
                      <span>点击选择</span>
                      <svg className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 物资库选择 */}
        {selectedTeam && !selectedWarehouse && (
          <div>
            <div className="mb-6">
              <button
                onClick={() => {
                  setSelectedTeam(null);
                  setWarehouses([]);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-xl hover:bg-gray-50 shadow-md border border-gray-200 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                返回选择班组
              </button>
            </div>
            
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedTeam.name}</h2>
                  <p className="text-gray-500">请选择要巡查的物资库</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {warehouses.map((warehouse) => (
                <button
                  key={warehouse.id}
                  onClick={() => handleWarehouseSelect(warehouse)}
                  className="group bg-white p-6 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-emerald-500 text-left"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center mb-3 group-hover:bg-emerald-100 transition-colors">
                        <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">{warehouse.name}</h3>
                      <p className="text-sm text-gray-400 mt-1 group-hover:text-emerald-500 transition-colors">点击进入巡查 →</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 物资库详情 */}
        {selectedWarehouse && currentView === "list" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedWarehouse.name}</h2>
                <p className="text-gray-600 mt-1">消防器材列表</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentView("addEquipment")}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 shadow-lg transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  添加器材
                </button>
                <button
                  onClick={() => {
                    setExportWarehouseId(selectedWarehouse.id);
                    setExportAreaId(selectedArea?.id || "");
                    setShowExportDialog(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  导出记录
                </button>
                <button
                  onClick={() => {
                    setSelectedWarehouse(null);
                    setSelectedArea(null);
                    setCurrentView("list");
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-xl hover:bg-gray-50 shadow-md border border-gray-200 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  返回选择物资库
                </button>
              </div>
            </div>

            {/* 区域筛选 */}
            {areas.length > 0 && (
              <div className="mb-6 bg-white rounded-2xl shadow-md p-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <label className="text-sm font-medium text-gray-700">筛选区域：</label>
                  <select
                    value={selectedArea?.id || ""}
                    onChange={(e) => {
                      const areaId = e.target.value;
                      const area = areaId ? areas.find(a => a.id === areaId) || null : null;
                      handleAreaSelect(area);
                    }}
                    className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <option value="">全部区域</option>
                    {areas.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.name}
                      </option>
                    ))}
                  </select>
                  {selectedArea && (
                    <span className="text-sm text-gray-600">
                      已选择: <span className="font-semibold text-emerald-600">{selectedArea.name}</span>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* 责任人和编号搜索 */}
            {activeTab === "equipment" && (
              <div className="mb-6 bg-white rounded-2xl shadow-md p-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <label className="text-sm font-medium text-gray-700">搜索：</label>
                  <div className="relative flex-1 max-w-md">
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      placeholder="输入责任人或编号搜索..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50 hover:bg-gray-100 transition-colors"
                    />
                  </div>
                  {searchKeyword && (
                    <button
                      onClick={() => setSearchKeyword("")}
                      className="text-sm text-emerald-600 hover:text-emerald-800 font-medium"
                    >
                      清除搜索
                    </button>
                  )}
                  {/* 区域管理按钮 */}
                  <button
                    onClick={() => setShowAreaManager(true)}
                    className="ml-auto px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl flex items-center gap-2 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    管理区域
                  </button>
                </div>
              </div>
            )}

            {/* Tab切换 */}
            <div className="mb-6 bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="flex border-b border-gray-100">
                <button
                  onClick={() => {
                    setActiveTab("equipment");
                    setCurrentView("list"); // 切换回器材Tab时重置视图
                  }}
                  className={`flex-1 px-6 py-4 font-semibold text-center transition-all relative ${
                    activeTab === "equipment"
                      ? "text-emerald-700 bg-emerald-50"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span>器材巡查</span>
                    {equipments.filter(e => shouldShowWarning(e)).length > 0 && (
                      <span className="ml-1 px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">{equipments.filter(e => shouldShowWarning(e)).length}</span>
                    )}
                  </div>
                  {activeTab === "equipment" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600"></div>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("monthly")}
                  className={`flex-1 px-6 py-4 font-semibold text-center transition-all relative ${
                    activeTab === "monthly"
                      ? "text-emerald-700 bg-emerald-50"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>月度防火检查</span>
                    {(() => {
                      const now = new Date();
                      const currentDay = now.getDate();
                      const isInspectionPeriod = currentDay >= 20 && currentDay <= 25;
                      const latestCheck = monthlyChecks[0];
                      const hasCurrentMonthCheck = latestCheck && 
                        new Date(latestCheck.checkDate).getMonth() === now.getMonth() &&
                        new Date(latestCheck.checkDate).getFullYear() === now.getFullYear();
                      return (!hasCurrentMonthCheck && isInspectionPeriod) && (
                        <span className="ml-1 px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">!</span>
                      );
                    })()}
                  </div>
                  {activeTab === "monthly" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600"></div>
                  )}
                </button>
              </div>
            </div>

            {/* 器材巡查 Tab */}
            {activeTab === "equipment" && (
              <>
                {/* 计算过滤后的器材列表 */}
                {(() => {
                  const filteredEquipments = searchKeyword
                    ? equipments.filter(e => 
                        (e.responsiblePerson && e.responsiblePerson.toLowerCase().includes(searchKeyword.toLowerCase())) ||
                        (e.code && e.code.toLowerCase().includes(searchKeyword.toLowerCase()))
                      )
                    : equipments;
                  return filteredEquipments.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                      <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">
                        {searchKeyword ? "未找到匹配的器材" : "暂无器材记录"}
                      </h3>
                      <p className="text-gray-500 mb-6">
                        {searchKeyword ? "请尝试其他关键词" : "开始添加消防器材，建立巡查记录"}
                      </p>
                      {!searchKeyword && (
                        <button
                          onClick={() => setCurrentView("addEquipment")}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-lg hover:shadow-xl transition-all"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          添加第一个消防器材
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="mb-4 text-sm text-gray-600">
                      {searchKeyword && (
                        <span>找到 {filteredEquipments.length} 个匹配的器材</span>
                      )}
                    </div>
                  );
                })()}

                {(searchKeyword ? 
                  equipments.filter(e => 
                    (e.responsiblePerson && e.responsiblePerson.toLowerCase().includes(searchKeyword.toLowerCase())) ||
                    (e.code && e.code.toLowerCase().includes(searchKeyword.toLowerCase()))
                  ) : equipments
                ).length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(searchKeyword ? 
                      equipments.filter(e => 
                        (e.responsiblePerson && e.responsiblePerson.toLowerCase().includes(searchKeyword.toLowerCase())) ||
                        (e.code && e.code.toLowerCase().includes(searchKeyword.toLowerCase()))
                      ) : equipments
                    ).map((equipment) => {
                      const needsWarning = shouldShowWarning(equipment);
                      return (
                        <div
                          key={equipment.id}
                          className={`group relative rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden ${
                            needsWarning 
                              ? 'bg-gradient-to-br from-red-50 to-red-100 ring-4 ring-red-400' 
                              : 'bg-white'
                          }`}
                        >
                          {/* 预警标识 */}
                          {needsWarning && (
                            <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-medium px-3 py-1.5 flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              {getWarningText(equipment)}
                            </div>
                          )}

                          <div className={`p-6 ${needsWarning ? 'pt-10' : ''}`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                    needsWarning ? "bg-red-200"
                                    : equipment.type === "消火栓"
                                      ? "bg-blue-100"
                                      : equipment.type === "灭火器"
                                      ? "bg-red-100"
                                      : equipment.type === "消防沙"
                                      ? "bg-amber-100"
                                      : equipment.type === "洗眼器"
                                      ? "bg-cyan-100"
                                      : equipment.type === "防汛"
                                      ? "bg-sky-100"
                                      : equipment.type === "防寒"
                                      ? "bg-indigo-100"
                                      : "bg-emerald-100"
                                  }`}>
                                    {needsWarning && (
                                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                      </svg>
                                    )}
                                    {!needsWarning && equipment.type === "消火栓" && (
                                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                      </svg>
                                    )}
                                    {!needsWarning && equipment.type === "灭火器" && (
                                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                                      </svg>
                                    )}
                                    {!needsWarning && equipment.type === "消防沙" && (
                                      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                      </svg>
                                    )}
                                    {!needsWarning && equipment.type === "洗眼器" && (
                                      <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                      </svg>
                                    )}
                                    {!needsWarning && equipment.type === "防汛" && (
                                      <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                                      </svg>
                                    )}
                                    {!needsWarning && equipment.type === "防寒" && (
                                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                      </svg>
                                    )}
                                  </div>
                                  <h3 className={`text-lg font-semibold ${needsWarning ? 'text-red-800' : 'text-gray-900'}`}>
                                    {equipment.type}
                                  </h3>
                                </div>
                                <p className={`text-sm ${needsWarning ? 'text-red-600' : 'text-gray-500'}`}>编号: {equipment.code}</p>
                                <p className={`text-sm ${needsWarning ? 'text-red-600' : 'text-gray-500'}`}>责任人: {equipment.responsiblePerson || "未设置"}</p>
                              </div>
                              <span
                                className={`px-2 py-1 text-xs rounded-full font-medium ${
                                  equipment.type === "消火栓"
                                    ? "bg-blue-100 text-blue-700"
                                    : equipment.type === "灭火器"
                                    ? "bg-red-100 text-red-700"
                                    : equipment.type === "消防沙"
                                    ? "bg-amber-100 text-amber-700"
                                    : equipment.type === "洗眼器"
                                    ? "bg-cyan-100 text-cyan-700"
                                    : equipment.type === "防汛"
                                    ? "bg-sky-100 text-sky-700"
                                    : equipment.type === "防寒"
                                    ? "bg-indigo-100 text-indigo-700"
                                    : "bg-emerald-100 text-emerald-700"
                                }`}
                              >
                                {equipment.type}
                              </span>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                              <button
                                onClick={() => handleInspect(equipment)}
                                className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                                开始巡查
                              </button>
                              <button
                                onClick={() => handleViewRecords(equipment)}
                                className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                查看记录
                              </button>
                              <button
                                onClick={() => handleEditEquipment(equipment)}
                                className="px-3 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 text-sm font-medium transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteEquipment(equipment)}
                                className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* 月度防火检查 Tab */}
            {activeTab === "monthly" && currentMonthlyView === "list" && (
              <>
                {/* 智慧化标题区域 */}
                <div className="mb-8">
                  <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                    {/* 科技感背景装饰 */}
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500 rounded-full filter blur-3xl"></div>
                      <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500 rounded-full filter blur-3xl"></div>
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                              </svg>
                            </div>
                            <div>
                              <h2 className="text-2xl font-bold text-white">月度防火安全检查</h2>
                              <p className="text-slate-400 text-sm">AI智慧巡查 · 智能预警</p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-cyan-400">
                            {areas.length > 0 ? Math.round((monthlyChecks.filter(c => {
                              const now = new Date();
                              const checkDate = new Date(c.checkDate);
                              return checkDate.getMonth() === now.getMonth() && checkDate.getFullYear() === now.getFullYear();
                            }).length / areas.length) * 100) : 0}%
                          </div>
                          <div className="text-slate-400 text-sm">本月完成率</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 统计卡片区域 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white rounded-xl p-4 shadow-md border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-slate-800">{areas.length}</div>
                        <div className="text-xs text-slate-500">库区总数</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-md border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-slate-800">
                          {monthlyChecks.filter(c => {
                            const now = new Date();
                            const checkDate = new Date(c.checkDate);
                            return checkDate.getMonth() === now.getMonth() && checkDate.getFullYear() === now.getFullYear();
                          }).length}
                        </div>
                        <div className="text-xs text-slate-500">已检查</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-md border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-slate-800">
                          {(() => {
                            const now = new Date();
                            const currentDay = now.getDate();
                            const isInspectionPeriod = currentDay >= 20 && currentDay <= 25;
                            if (!isInspectionPeriod) return 0;
                            const checkedIds = monthlyChecks.filter(c => {
                              const checkDate = new Date(c.checkDate);
                              return checkDate.getMonth() === now.getMonth() && checkDate.getFullYear() === now.getFullYear();
                            }).map(c => c.areaId);
                            return areas.filter(a => !checkedIds.includes(a.id)).length;
                          })()}
                        </div>
                        <div className="text-xs text-slate-500">待检查</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-md border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-slate-800">20-25</div>
                        <div className="text-xs text-slate-500">检查周期</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 操作栏 */}
                <div className="mb-6 flex justify-between items-center">
                  {selectedWarehouse && (
                    <button
                      onClick={handleExportMonthlyCheck}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-all shadow-md hover:shadow-lg"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      导出记录
                    </button>
                  )}
                  <div className="text-sm text-slate-600 bg-slate-100 px-4 py-2 rounded-lg flex items-center gap-2">
                    <svg className="w-4 h-4 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    每月20-25日为巡查周期
                  </div>
                </div>

                {/* 区域卡片网格 */}
                {areas.length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-slate-800 mb-2">暂无库区信息</h3>
                    <p className="text-slate-500 mb-6">请先在器材巡查中添加库区</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {areas.map((area) => {
                      const areaChecks = monthlyChecks.filter(c => c.areaId === area.id);
                      const now = new Date();
                      const currentMonthCheck = areaChecks.find(c => {
                        const checkDate = new Date(c.checkDate);
                        return checkDate.getMonth() === now.getMonth() && checkDate.getFullYear() === now.getFullYear();
                      });
                      const currentDay = now.getDate();
                      const isInspectionPeriod = currentDay >= 20 && currentDay <= 25;
                      const needsWarning = !currentMonthCheck && isInspectionPeriod;
                      
                      return (
                        <div
                          key={area.id}
                          className={`relative overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                            needsWarning
                              ? "bg-gradient-to-br from-red-500 to-red-600 shadow-red-200"
                              : currentMonthCheck
                              ? "bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-emerald-200"
                              : "bg-gradient-to-br from-slate-700 to-slate-800 shadow-slate-200"
                          }`}
                        >
                          {/* 卡片顶部装饰 */}
                          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                          
                          <div className="relative p-5">
                            {/* 状态标签 */}
                            <div className="flex items-center justify-between mb-4">
                              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                                needsWarning
                                  ? "bg-white/20 text-white"
                                  : currentMonthCheck
                                  ? "bg-white/20 text-white"
                                  : "bg-slate-600 text-slate-300"
                              }`}>
                                {needsWarning ? "⚠️ 需检查" : currentMonthCheck ? "✓ 已完成" : "○ 待检查"}
                              </div>
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                needsWarning
                                  ? "bg-white/20"
                                  : currentMonthCheck
                                  ? "bg-white/20"
                                  : "bg-slate-600"
                              }`}>
                                {needsWarning ? (
                                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                  </svg>
                                ) : currentMonthCheck ? (
                                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                  </svg>
                                )}
                              </div>
                            </div>
                            
                            {/* 区域名称 */}
                            <h4 className="text-lg font-bold text-white mb-1">{area.name}</h4>
                            <p className={`text-sm mb-4 ${needsWarning ? "text-red-100" : currentMonthCheck ? "text-emerald-100" : "text-slate-400"}`}>
                              {currentMonthCheck
                                ? `已检查 · ${new Date(currentMonthCheck.checkDate).toLocaleDateString("zh-CN")}`
                                : needsWarning
                                ? "检查周期已到，请立即检查"
                                : "非检查周期或尚未开始检查"
                              }
                            </p>
                            
                            {/* 操作按钮 */}
                            {currentMonthCheck ? (
                              <button
                                onClick={() => handleViewMonthlyDetail(currentMonthCheck)}
                                className="w-full py-2.5 bg-white text-emerald-600 rounded-xl font-medium hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                查看记录
                              </button>
                            ) : needsWarning ? (
                              <button
                                onClick={() => handleAreaMonthlyClick(area)}
                                className="w-full py-2.5 bg-white text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                立即巡查
                              </button>
                            ) : (
                              <button
                                onClick={() => handleAreaMonthlyClick(area)}
                                className="w-full py-2.5 bg-white/20 text-white rounded-xl font-medium hover:bg-white/30 transition-colors flex items-center justify-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                开始巡查
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 历史月度检查记录 */}
                {monthlyChecks.length > 0 && (
                  <div className="mt-8 bg-white rounded-2xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-800">历史检查记录</h3>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">选择月份：</label>
                        <select
                          value={selectedMonthlyYearMonth}
                          onChange={(e) => setSelectedMonthlyYearMonth(e.target.value)}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {/* 生成年月选项 */}
                          {(() => {
                            const months = new Set<string>();
                            monthlyChecks.forEach(check => {
                              const date = new Date(check.checkDate);
                              const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                              months.add(yearMonth);
                            });
                            const sortedMonths = Array.from(months).sort((a, b) => b.localeCompare(a));
                            return sortedMonths.map(ym => {
                              const [year, month] = ym.split('-');
                              return (
                                <option key={ym} value={ym}>
                                  {year}年{parseInt(month)}月
                                </option>
                              );
                            });
                          })()}
                        </select>
                      </div>
                    </div>
                    {(() => {
                      const filteredChecks = monthlyChecks.filter(check => {
                        const date = new Date(check.checkDate);
                        const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                        return yearMonth === selectedMonthlyYearMonth;
                      });

                      if (filteredChecks.length === 0) {
                        return (
                          <div className="text-center py-8 text-gray-500">
                            该月份暂无检查记录
                          </div>
                        );
                      }

                      return (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">检查日期</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">库区</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">检查人</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">结论</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {filteredChecks.map((check) => {
                                const area = areas.find(a => a.id === check.areaId);
                                return (
                                  <tr key={check.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm text-gray-900">{new Date(check.checkDate).toLocaleDateString("zh-CN")}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900">{area?.name || "-"}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900">{check.inspectorName}</td>
                                    <td className="px-4 py-3">
                                      <span className={`px-2 py-1 text-xs rounded ${
                                        check.overallConclusion === "合格" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                      }`}>
                                        {check.overallConclusion}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3">
                                      <button
                                        onClick={() => handleViewMonthlyDetail(check)}
                                        className="text-emerald-600 hover:text-emerald-800 text-sm"
                                      >
                                        查看详情
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          <div className="mt-3 text-sm text-gray-500 text-right">
                            共 {filteredChecks.length} 条记录
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </>
            )}

          </div>
        )}

        {/* 月度检查表单 */}
        {activeTab === "monthly" && currentMonthlyView === "add" && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-6">
              <button
                onClick={() => setCurrentMonthlyView("list")}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 mr-4"
              >
                返回
              </button>
              <h2 className="text-xl font-semibold text-gray-800">
                新增月度防火检查 - {selectedWarehouse?.name}
              </h2>
            </div>

            <div className="space-y-6">
              {/* 基本信息 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">检查日期 *</label>
                  <input
                    type="date"
                    value={monthlyCheckDate}
                    onChange={(e) => setMonthlyCheckDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">检查人 *</label>
                  <input
                    type="text"
                    value={monthlyInspectorName}
                    onChange={(e) => setMonthlyInspectorName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="请输入检查人姓名"
                  />
                </div>
              </div>

              {/* 检查项目 */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">检查项目</h3>
                <div className="space-y-4">
                  {MONTHLY_CHECK_ITEMS.map((item) => (
                    <div key={item.key} className="bg-gray-50 p-4 rounded-lg">
                      <label className="text-sm text-gray-700 mb-2 block">{item.label}</label>
                      {item.key === "otherCheckItems" ? (
                        <textarea
                          value={monthlyCheckValues[item.key] || ""}
                          onChange={(e) => setMonthlyCheckValues({ ...monthlyCheckValues, [item.key]: e.target.value })}
                          className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                          rows={3}
                          placeholder="请输入其他检查内容"
                        />
                      ) : (
                        <div className="flex gap-4 mt-2">
                          {["合格", "不合格", "不适用"].map((option) => (
                            <label key={option} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={item.key}
                                value={option}
                                checked={monthlyCheckValues[item.key] === option}
                                onChange={(e) => setMonthlyCheckValues({ ...monthlyCheckValues, [item.key]: e.target.value })}
                                className="w-4 h-4 text-green-600"
                              />
                              <span className="text-sm">{option}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 总体结论 */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">总体结论 *</h3>
                <div className="flex gap-4">
                  {(["合格", "不合格"] as const).map((option) => (
                    <label key={option} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="overallConclusion"
                        value={option}
                        checked={monthlyConclusion === option}
                        onChange={(e) => setMonthlyConclusion(e.target.value as "合格" | "不合格")}
                        className="w-4 h-4 text-green-600"
                      />
                      <span className="text-sm font-medium">{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 照片上传与AI隐患判断 */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">📷 照片上传与AI隐患判断</h3>
                <div className="space-y-4">
                  {/* 照片上传区域 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      上传照片（支持多张）
                    </label>
                    <label className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 text-blue-600 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors border-2 border-dashed border-blue-200">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="font-medium">点击添加照片</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleMonthlyPhotoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  
                  {/* 照片预览网格 */}
                  {monthlyPhotoPreviews.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {monthlyPhotoPreviews.map((preview, index) => (
                        <div key={index} className="relative group">
                          <div className="aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                            <img src={preview} alt={`照片${index + 1}`} className="w-full h-full object-cover" />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeMonthlyPhoto(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                          <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-2 py-0.5 rounded">
                            {index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* 照片数量提示 */}
                  {monthlyPhotoFiles.length > 0 && (
                    <p className="text-sm text-gray-500">
                      已选择 {monthlyPhotoFiles.length} 张照片
                    </p>
                  )}

                  {/* AI分析按钮 */}
                  {monthlyPhotoFiles.length > 0 && (
                    <button
                      type="button"
                      onClick={analyzeMonthlyPhotos}
                      disabled={monthlyAiLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.866-.354-1.694-1-2.31l-.549-.547z" />
                      </svg>
                      {monthlyAiLoading ? "AI分析中..." : "🔍 AI隐患分析"}
                    </button>
                  )}

                  {/* AI分析加载状态 */}
                  {monthlyAiLoading && (
                    <div className="flex items-center gap-3 text-purple-600 bg-purple-50 p-4 rounded-lg">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>AI正在分析 {monthlyPhotoFiles.length} 张照片中的隐患...</span>
                    </div>
                  )}

                  {/* AI分析结果 */}
                  {monthlyAiResult && !monthlyAiLoading && (
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">🤖</span>
                        <div className="flex-1">
                          <p className="font-medium text-yellow-800 mb-1">AI隐患分析结果：</p>
                          <p className="text-yellow-700 whitespace-pre-wrap">{monthlyAiResult}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 备注 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">备注</label>
                <textarea
                  value={monthlyRemarks}
                  onChange={(e) => setMonthlyRemarks(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  rows={3}
                  placeholder="请输入备注信息"
                />
              </div>

              {/* 提交按钮 */}
              <div className="flex gap-4 pt-4">
                <button
                  onClick={submitMonthlyCheck}
                  disabled={uploading}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {uploading ? "提交中..." : "提交"}
                </button>
                <button
                  onClick={() => setCurrentMonthlyView("list")}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 月度检查详情 */}
        {activeTab === "monthly" && currentMonthlyView === "detail" && selectedMonthlyCheck && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-6">
              <button
                onClick={() => setCurrentMonthlyView("list")}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 mr-4"
              >
                返回
              </button>
              <h2 className="text-xl font-semibold text-gray-800">月度检查详情</h2>
            </div>

            <div className="space-y-6">
              {/* 基本信息 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-green-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">检查日期</p>
                  <p className="font-medium">{new Date(selectedMonthlyCheck.checkDate).toLocaleDateString("zh-CN")}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">检查人</p>
                  <p className="font-medium">{selectedMonthlyCheck.inspectorName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">总体结论</p>
                  <span className={`px-2 py-1 rounded text-sm ${
                    selectedMonthlyCheck.overallConclusion === "合格" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}>
                    {selectedMonthlyCheck.overallConclusion}
                  </span>
                </div>
              </div>

              {/* 检查项目详情 */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">检查项目详情</h3>
                <div className="space-y-3">
                  {MONTHLY_CHECK_ITEMS.map((item) => {
                    const value = (selectedMonthlyCheck as any)[item.key];
                    return (
                      <div key={item.key} className="flex items-start gap-4 p-3 bg-gray-50 rounded">
                        <div className="flex-1">
                          <p className="text-sm text-gray-700">{item.label}</p>
                          {item.key === "otherCheckItems" ? (
                            <p className="mt-1 text-gray-800">{value || "无"}</p>
                          ) : (
                            <p className="mt-1 font-medium">
                              {value ? (
                                <span className={`px-2 py-1 rounded text-xs ${
                                  value === "合格" ? "bg-green-100 text-green-700" : 
                                  value === "不合格" ? "bg-red-100 text-red-700" : 
                                  "bg-gray-200 text-gray-600"
                                }`}>
                                  {value}
                                </span>
                              ) : <span className="text-gray-400">未检查</span>}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 备注 */}
              {selectedMonthlyCheck.remarks && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">备注</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedMonthlyCheck.remarks}</p>
                </div>
              )}

              {/* 照片和AI分析结果 */}
              {(selectedMonthlyCheck as any).photoUrl && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">📷 检查照片</h3>
                  <div className="space-y-4">
                    <div className="relative inline-block">
                      <img 
                        src={(selectedMonthlyCheck as any).photoUrl} 
                        alt="检查照片" 
                        className="max-w-full h-64 rounded-lg border border-gray-200 object-cover cursor-pointer hover:opacity-90"
                        onClick={() => {
                          setPreviewPhotoUrl((selectedMonthlyCheck as any).photoUrl);
                          setPreviewPhotoRecordId(selectedMonthlyCheck.id);
                        }}
                      />
                    </div>
                    {(selectedMonthlyCheck as any).aiResult && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">🤖</span>
                          <div className="flex-1">
                            <p className="font-medium text-yellow-800 mb-1">AI隐患分析结果：</p>
                            <p className="text-yellow-700 whitespace-pre-wrap">{(selectedMonthlyCheck as any).aiResult}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 添加器材表单 */}
        {currentView === "addEquipment" && selectedWarehouse && (
          <div>
            <div className="mb-6">
              <button
                onClick={() => setCurrentView("list")}
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
                {/* 区域选择 */}
                {areas.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      所属区域
                    </label>
                    <select
                      value={selectedAreaId}
                      onChange={(e) => setSelectedAreaId(e.target.value)}
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

                {/* 器材类型 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    器材类型 *
                  </label>
                  {!isCustomType ? (
                    <select
                      value={newEquipmentType}
                      onChange={(e) => {
                        setNewEquipmentType(e.target.value);
                        if (e.target.value === "其他") {
                          setIsCustomType(true);
                          setCustomType("");
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
                      onChange={(e) => setCustomType(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50"
                      placeholder="请输入器材类型"
                    />
                  )}
                  {isCustomType && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomType(false);
                        setNewEquipmentType("消火栓");
                        setCustomType("");
                      }}
                      className="mt-2 text-sm text-emerald-600 hover:underline"
                    >
                      返回选择预置类型
                    </button>
                  )}
                </div>

                {/* 器材编号 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    器材编号 *
                  </label>
                  <input
                    type="text"
                    value={newEquipmentCode}
                    onChange={(e) => setNewEquipmentCode(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50 hover:bg-gray-100 transition-colors"
                    placeholder="请输入器材编号，如：XH-001"
                  />
                </div>

                {/* 器材包保责任人 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    器材包保责任人 *
                  </label>
                  <input
                    type="text"
                    value={newResponsiblePerson}
                    onChange={(e) => setNewResponsiblePerson(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50 hover:bg-gray-100 transition-colors"
                    placeholder="请输入责任人姓名"
                  />
                </div>

                {/* 提交按钮 */}
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={handleAddEquipment}
                    disabled={addingEquipment}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                  >
                    {addingEquipment ? "添加中..." : "添加器材"}
                  </button>
                  <button
                    onClick={() => setCurrentView("list")}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 编辑器材表单 */}
        {currentView === "editEquipment" && editingEquipment && selectedWarehouse && (
          <div>
            <div className="mb-6">
              <button
                onClick={() => setCurrentView("list")}
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
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">编辑消防器材</h2>
              </div>

              <div className="space-y-6">
                {/* 器材类型 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    器材类型 *
                  </label>
                  {!editingIsCustomType ? (
                    <select
                      value={editingEquipmentType}
                      onChange={(e) => {
                        setEditingEquipmentType(e.target.value);
                        if (e.target.value === "其他") {
                          setEditingIsCustomType(true);
                          setEditingCustomType("");
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
                      value={editingCustomType}
                      onChange={(e) => setEditingCustomType(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50"
                      placeholder="请输入器材类型"
                    />
                  )}
                  {editingIsCustomType && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingIsCustomType(false);
                        setEditingEquipmentType("消火栓");
                        setEditingCustomType("");
                      }}
                      className="mt-2 text-sm text-emerald-600 hover:underline"
                    >
                      返回选择预置类型
                    </button>
                  )}
                </div>

                {/* 器材编号 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    器材编号 *
                  </label>
                  <input
                    type="text"
                    value={editingEquipmentCode}
                    onChange={(e) => setEditingEquipmentCode(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50 hover:bg-gray-100 transition-colors"
                    placeholder="请输入器材编号，如：XH-001"
                  />
                </div>

                {/* 器材包保责任人 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    器材包保责任人 *
                  </label>
                  <input
                    type="text"
                    value={editingResponsiblePerson}
                    onChange={(e) => setEditingResponsiblePerson(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50 hover:bg-gray-100 transition-colors"
                    placeholder="请输入责任人姓名"
                  />
                </div>

                {/* 区域选择 */}
                {areas.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      所属区域
                    </label>
                    <select
                      value={editingAreaId || ""}
                      onChange={(e) => setEditingAreaId(e.target.value || null)}
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

                {/* 提交按钮 */}
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={handleSaveEditEquipment}
                    disabled={editingEquipmentLoading}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                  >
                    {editingEquipmentLoading ? "保存中..." : "保存修改"}
                  </button>
                  <button
                    onClick={() => setCurrentView("list")}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 巡查表单 */}
        {currentView === "inspection" && selectedEquipment && (
          <div>
            <div className="mb-6">
              <button
                onClick={() => {
                  // 返回列表时恢复搜索状态和器材选中状态
                  if (savedSearchKeyword) {
                    setSearchKeyword(savedSearchKeyword);
                  }
                  if (lastSelectedEquipmentId) {
                    const equipment = equipments.find(e => e.id === lastSelectedEquipmentId);
                    if (equipment) {
                      setSelectedEquipment(equipment);
                    }
                  }
                  setCurrentView("list");
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-xl hover:bg-gray-50 shadow-md border border-gray-200 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                返回
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  巡查记录 - {selectedEquipment.type} ({selectedEquipment.code})
                </h2>
              </div>

              <div className="space-y-6">
                {/* 照片上传 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    照片 *
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-emerald-400 transition-colors">
                    {photoPreview ? (
                      <div className="space-y-4">
                        <img
                          src={photoPreview}
                          alt="预览"
                          className="max-h-64 mx-auto rounded-lg"
                        />
                        <button
                          onClick={() => {
                            setPhotoFile(null);
                            setPhotoPreview("");
                            setAiResult("");
                          }}
                          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          删除照片
                        </button>
                        {photoPreview && !aiResult && (
                          <button
                            onClick={handleAIAnalyze}
                            disabled={aiAnalyzing}
                            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                          >
                            {aiAnalyzing ? "AI 分析中..." : "AI 智能分析"}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoSelect}
                          className="hidden"
                          id="photo-upload"
                        />
                        <label
                          htmlFor="photo-upload"
                          className="cursor-pointer inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          选择照片
                        </label>
                        <p className="text-sm text-gray-500 mt-2">支持 JPG、PNG、WebP 格式</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI 分析结果 */}
                {aiResult && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="font-semibold text-purple-900 mb-2">AI 分析结果</h4>
                    <pre className="text-sm text-purple-800 whitespace-pre-wrap">
                      {aiResult}
                    </pre>
                  </div>
                )}

                {/* 巡查状态 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    巡查状态 *
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as "良好" | "异常")}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="良好">良好</option>
                    <option value="异常">异常</option>
                  </select>
                </div>

                {/* 巡查人姓名 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    巡查人姓名 *
                  </label>
                  <select
                    value={useCustomInspector ? "custom" : "responsible"}
                    onChange={(e) => {
                      setUseCustomInspector(e.target.value === "custom");
                      if (e.target.value === "responsible") {
                        setCustomInspectorName("");
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="responsible">
                      使用器材责任人：{selectedEquipment?.responsiblePerson}
                    </option>
                    <option value="custom">自定义巡查人</option>
                  </select>
                  {useCustomInspector && (
                    <input
                      type="text"
                      value={customInspectorName}
                      onChange={(e) => setCustomInspectorName(e.target.value)}
                      className="w-full mt-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="请输入巡查人姓名"
                    />
                  )}
                </div>

                {/* 消火栓专项检查项 */}
                {selectedEquipment.type === "消火栓" && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-4">消火栓专项检查</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          消火栓前无杂物，箱门无锁闭 *
                        </label>
                        <select
                          value={hydrantFrontClear}
                          onChange={(e) => setHydrantFrontClear(e.target.value as "良好" | "异常")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          箱体外观正常，开度120°以上 *
                        </label>
                        <select
                          value={hydrantBoxAppearance}
                          onChange={(e) => setHydrantBoxAppearance(e.target.value as "良好" | "异常")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          标识、流程图完好 *
                        </label>
                        <select
                          value={hydrantSignage}
                          onChange={(e) => setHydrantSignage(e.target.value as "良好" | "异常")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          消火栓无渗漏水 *
                        </label>
                        <select
                          value={hydrantNoLeakage}
                          onChange={(e) => setHydrantNoLeakage(e.target.value as "良好" | "异常")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          水带、水枪、按钮完好 *
                        </label>
                        <select
                          value={hydrantEquipmentComplete}
                          onChange={(e) => setHydrantEquipmentComplete(e.target.value as "良好" | "异常")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          水带摆放整齐，无老化 *
                        </label>
                        <select
                          value={hydrantHoseCondition}
                          onChange={(e) => setHydrantHoseCondition(e.target.value as "良好" | "异常")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          水枪、接口、阀门完好 *
                        </label>
                        <select
                          value={hydrantValveCondition}
                          onChange={(e) => setHydrantValveCondition(e.target.value as "良好" | "异常")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          卷盘软管有序，无龟裂 *
                        </label>
                        <select
                          value={hydrantReelCondition}
                          onChange={(e) => setHydrantReelCondition(e.target.value as "良好" | "异常")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          枪头完好，连接紧固 *
                        </label>
                        <select
                          value={hydrantNozzleCondition}
                          onChange={(e) => setHydrantNozzleCondition(e.target.value as "良好" | "异常")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          消火栓内无杂物 *
                        </label>
                        <select
                          value={hydrantNoDebris}
                          onChange={(e) => setHydrantNoDebris(e.target.value as "良好" | "异常")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* 灭火器专项检查项 */}
                {selectedEquipment.type === "灭火器" && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-semibold text-red-900 mb-4">灭火器专项检查</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          配置数量、型号正确 *
                        </label>
                        <select
                          value={extinguisherConfigCorrect}
                          onChange={(e) => setExtinguisherConfigCorrect(e.target.value as "良好" | "异常")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          在有效期内 *
                        </label>
                        <select
                          value={extinguisherWithinExpiration}
                          onChange={(e) => setExtinguisherWithinExpiration(e.target.value as "良好" | "异常")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          筒体无锈蚀、变形等异常 *
                        </label>
                        <select
                          value={extinguisherCylinderNormal}
                          onChange={(e) => setExtinguisherCylinderNormal(e.target.value as "良好" | "异常")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          喷嘴无堵塞、破损等异常 *
                        </label>
                        <select
                          value={extinguisherNozzleNormal}
                          onChange={(e) => setExtinguisherNozzleNormal(e.target.value as "良好" | "异常")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          管路无老化、腐蚀等异常 *
                        </label>
                        <select
                          value={extinguisherPipelineNormal}
                          onChange={(e) => setExtinguisherPipelineNormal(e.target.value as "良好" | "异常")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          铅封良好 *
                        </label>
                        <select
                          value={extinguisherSealIntact}
                          onChange={(e) => setExtinguisherSealIntact(e.target.value as "良好" | "异常")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          压力表指针处于绿区（干粉） *
                        </label>
                        <select
                          value={extinguisherPressureNormal}
                          onChange={(e) => setExtinguisherPressureNormal(e.target.value as "良好" | "异常")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          CO2称重合格（泄漏≤5%且≤50g） *
                        </label>
                        <select
                          value={extinguisherCo2WeightNormal}
                          onChange={(e) => setExtinguisherCo2WeightNormal(e.target.value as "良好" | "异常")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* 灭火器专项检查项 */}
                {selectedEquipment.type === "灭火器" && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-semibold text-red-900 mb-4">灭火器专项检查</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          配置数量、型号正确 *
                        </label>
                        <select
                          value={extinguisherConfigCorrect}
                          onChange={(e) => setExtinguisherConfigCorrect(e.target.value as "良好" | "异常")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          在有效期内 *
                        </label>
                        <select
                          value={extinguisherWithinExpiration}
                          onChange={(e) => setExtinguisherWithinExpiration(e.target.value as "良好" | "异常")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          筒体无锈蚀、变形等异常 *
                        </label>
                        <select
                          value={extinguisherCylinderNormal}
                          onChange={(e) => setExtinguisherCylinderNormal(e.target.value as "良好" | "异常")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          喷嘴无堵塞、破损等异常 *
                        </label>
                        <select
                          value={extinguisherNozzleNormal}
                          onChange={(e) => setExtinguisherNozzleNormal(e.target.value as "良好" | "异常")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          管路无老化、腐蚀等异常 *
                        </label>
                        <select
                          value={extinguisherPipelineNormal}
                          onChange={(e) => setExtinguisherPipelineNormal(e.target.value as "良好" | "异常")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          铅封良好 *
                        </label>
                        <select
                          value={extinguisherSealIntact}
                          onChange={(e) => setExtinguisherSealIntact(e.target.value as "良好" | "异常")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          压力表指针处于绿区（干粉） *
                        </label>
                        <select
                          value={extinguisherPressureNormal}
                          onChange={(e) => setExtinguisherPressureNormal(e.target.value as "良好" | "异常")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          CO2称重合格（泄漏≤5%且≤50g） *
                        </label>
                        <select
                          value={extinguisherCo2WeightNormal}
                          onChange={(e) => setExtinguisherCo2WeightNormal(e.target.value as "良好" | "异常")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* 消防沙专项检查项 */}
                {selectedEquipment.type === "消防沙" && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h4 className="font-semibold text-amber-900 mb-4">消防沙专项检查</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          铁锹翻动测试，无结块现象 *
                        </label>
                        <select
                          value={sandNoCaking}
                          onChange={(e) => setSandNoCaking(e.target.value as "良好" | "异常")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        >
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* 备注 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    备注
                  </label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="请输入备注信息（可选）"
                  />
                </div>

                {/* 提交按钮 */}
                <div className="flex gap-4">
                  <button
                    onClick={handleSubmit}
                    disabled={uploading}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {uploading ? "保存中..." : "保存巡查记录"}
                  </button>
                  <button
                    onClick={() => setCurrentView("list")}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 编辑巡查记录表单 */}
        {currentView === "editRecord" && editingRecord && selectedEquipment && (
          <div>
            <div className="mb-6">
              <button
                onClick={() => setCurrentView("records")}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                返回
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-md p-8 max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                编辑巡查记录 - {selectedEquipment.type} ({selectedEquipment.code})
              </h2>

              <div className="space-y-6">
                {/* 原有信息 */}
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
                      onClick={() => {
                        setPreviewPhotoRecordId(editingRecord.id);
                        setPreviewPhotoUrl(`/api/record-photo?id=${editingRecord.id}`);
                      }}
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

                {/* 巡查状态 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    巡查状态 *
                  </label>
                  <select
                    value={editingStatus}
                    onChange={(e) => setEditingStatus(e.target.value as "良好" | "异常")}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="良好">良好</option>
                    <option value="异常">异常</option>
                  </select>
                </div>

                {/* 消火栓专项检查项 */}
                {selectedEquipment.type === "消火栓" && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-4">消火栓专项检查</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          消火栓前无杂物，箱门无锁闭 *
                        </label>
                        <select
                          value={editingHydrantFrontClear}
                          onChange={(e) => setEditingHydrantFrontClear(e.target.value as "良好" | "异常" | "")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">请选择</option>
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          箱体外观正常，开度120°以上 *
                        </label>
                        <select
                          value={editingHydrantBoxAppearance}
                          onChange={(e) => setEditingHydrantBoxAppearance(e.target.value as "良好" | "异常" | "")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">请选择</option>
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          标识、流程图完好 *
                        </label>
                        <select
                          value={editingHydrantSignage}
                          onChange={(e) => setEditingHydrantSignage(e.target.value as "良好" | "异常" | "")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">请选择</option>
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          消火栓无渗漏水 *
                        </label>
                        <select
                          value={editingHydrantNoLeakage}
                          onChange={(e) => setEditingHydrantNoLeakage(e.target.value as "良好" | "异常" | "")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">请选择</option>
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          水带、水枪、按钮完好 *
                        </label>
                        <select
                          value={editingHydrantEquipmentComplete}
                          onChange={(e) => setEditingHydrantEquipmentComplete(e.target.value as "良好" | "异常" | "")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">请选择</option>
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          水带摆放整齐，无老化 *
                        </label>
                        <select
                          value={editingHydrantHoseCondition}
                          onChange={(e) => setEditingHydrantHoseCondition(e.target.value as "良好" | "异常" | "")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">请选择</option>
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          水枪、接口、阀门完好 *
                        </label>
                        <select
                          value={editingHydrantValveCondition}
                          onChange={(e) => setEditingHydrantValveCondition(e.target.value as "良好" | "异常" | "")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">请选择</option>
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          卷盘软管有序，无龟裂 *
                        </label>
                        <select
                          value={editingHydrantReelCondition}
                          onChange={(e) => setEditingHydrantReelCondition(e.target.value as "良好" | "异常" | "")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">请选择</option>
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          枪头完好，连接紧固 *
                        </label>
                        <select
                          value={editingHydrantNozzleCondition}
                          onChange={(e) => setEditingHydrantNozzleCondition(e.target.value as "良好" | "异常" | "")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">请选择</option>
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          消火栓内无杂物 *
                        </label>
                        <select
                          value={editingHydrantNoDebris}
                          onChange={(e) => setEditingHydrantNoDebris(e.target.value as "良好" | "异常" | "")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">请选择</option>
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* 灭火器专项检查项 */}
                {selectedEquipment.type === "灭火器" && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-semibold text-red-900 mb-4">灭火器专项检查</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          配置数量、型号正确 *
                        </label>
                        <select
                          value={editingExtinguisherConfigCorrect}
                          onChange={(e) => setEditingExtinguisherConfigCorrect(e.target.value as "良好" | "异常" | "")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                          <option value="">请选择</option>
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          在有效期内 *
                        </label>
                        <select
                          value={editingExtinguisherWithinExpiration}
                          onChange={(e) => setEditingExtinguisherWithinExpiration(e.target.value as "良好" | "异常" | "")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                          <option value="">请选择</option>
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          筒体无锈蚀、变形等异常 *
                        </label>
                        <select
                          value={editingExtinguisherCylinderNormal}
                          onChange={(e) => setEditingExtinguisherCylinderNormal(e.target.value as "良好" | "异常" | "")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                          <option value="">请选择</option>
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          喷嘴无堵塞、破损等异常 *
                        </label>
                        <select
                          value={editingExtinguisherNozzleNormal}
                          onChange={(e) => setEditingExtinguisherNozzleNormal(e.target.value as "良好" | "异常" | "")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                          <option value="">请选择</option>
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          管路无老化、腐蚀等异常 *
                        </label>
                        <select
                          value={editingExtinguisherPipelineNormal}
                          onChange={(e) => setEditingExtinguisherPipelineNormal(e.target.value as "良好" | "异常" | "")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                          <option value="">请选择</option>
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          铅封良好 *
                        </label>
                        <select
                          value={editingExtinguisherSealIntact}
                          onChange={(e) => setEditingExtinguisherSealIntact(e.target.value as "良好" | "异常" | "")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                          <option value="">请选择</option>
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          压力表指针处于绿区（干粉） *
                        </label>
                        <select
                          value={editingExtinguisherPressureNormal}
                          onChange={(e) => setEditingExtinguisherPressureNormal(e.target.value as "良好" | "异常" | "")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                          <option value="">请选择</option>
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          CO2称重合格（泄漏≤5%且≤50g） *
                        </label>
                        <select
                          value={editingExtinguisherCo2WeightNormal}
                          onChange={(e) => setEditingExtinguisherCo2WeightNormal(e.target.value as "良好" | "异常" | "")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                          <option value="">请选择</option>
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* 消防沙专项检查项 */}
                {selectedEquipment.type === "消防沙" && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h4 className="font-semibold text-amber-900 mb-4">消防沙专项检查</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          铁锹翻动测试，无结块现象 *
                        </label>
                        <select
                          value={editingSandNoCaking}
                          onChange={(e) => setEditingSandNoCaking(e.target.value as "良好" | "异常" | "")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        >
                          <option value="">请选择</option>
                          <option value="良好">良好</option>
                          <option value="异常">异常</option>
                        </select>
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
                    onChange={(e) => setEditingRemarks(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="请输入备注信息（可选）"
                  />
                </div>

                {/* 提交按钮 */}
                <div className="flex gap-4">
                  <button
                    onClick={handleSaveEditRecord}
                    disabled={editingRecordLoading}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {editingRecordLoading ? "保存中..." : "保存修改"}
                  </button>
                  <button
                    onClick={() => setCurrentView("records")}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 巡查记录列表 */}
        {currentView === "records" && selectedEquipment && (
          <div>
            <div className="mb-6">
              <button
                onClick={() => {
                  // 返回列表时恢复搜索状态和器材选中状态
                  if (savedSearchKeyword) {
                    setSearchKeyword(savedSearchKeyword);
                  }
                  if (lastSelectedEquipmentId) {
                    const equipment = equipments.find(e => e.id === lastSelectedEquipmentId);
                    if (equipment) {
                      setSelectedEquipment(equipment);
                    }
                  }
                  setCurrentView("list");
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                返回
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                巡查记录 - {selectedEquipment.type} ({selectedEquipment.code})
              </h2>

              {inspectionRecords.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">暂无巡查记录</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* 按月份分组 */}
                  {Object.entries(
                    inspectionRecords.reduce((groups, record) => {
                      const date = new Date(record.inspectionTime);
                      const monthKey = `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月`;
                      if (!groups[monthKey]) {
                        groups[monthKey] = [];
                      }
                      groups[monthKey].push(record);
                      return groups;
                    }, {} as Record<string, typeof inspectionRecords>)
                  )
                    .sort(([a], [b]) => b.localeCompare(a)) // 按月份降序
                    .map(([month, records]) => (
                      <div key={month}>
                        {/* 月份标题 */}
                        <div className="bg-blue-50 px-4 py-2 rounded-lg mb-4">
                          <h3 className="text-lg font-semibold text-blue-900">{month}</h3>
                          <p className="text-sm text-blue-700">共 {records.length} 条记录</p>
                        </div>

                        {/* 该月份的记录 */}
                        <div className="space-y-3">
                          {records.map((record) => (
                            <div
                              key={record.id}
                              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <span
                                      className={`px-2 py-1 text-xs rounded ${
                                        record.status === "良好"
                                          ? "bg-green-100 text-green-700"
                                          : "bg-red-100 text-red-700"
                                      }`}
                                    >
                                      {record.status}
                                    </span>
                                    {record.aiStatus && (
                                      <span className="text-xs text-purple-600">
                                        AI 判定: {record.aiStatus}
                                      </span>
                                    )}
                                    <span className="text-xs text-gray-500">
                                      {new Date(record.inspectionTime).toLocaleDateString("zh-CN", {
                                        month: "long",
                                        day: "numeric",
                                      })}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {new Date(record.inspectionTime).toLocaleTimeString("zh-CN", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600">
                                    巡查人: {record.inspectorName}
                                  </p>
                                  {/* 消火栓专项检查项 */}
                                  {selectedEquipment.type === "消火栓" && (record.hydrantFrontClear || record.hydrantBoxAppearance || record.hydrantSignage || record.hydrantNoLeakage || record.hydrantEquipmentComplete || record.hydrantHoseCondition || record.hydrantValveCondition || record.hydrantReelCondition || record.hydrantNozzleCondition || record.hydrantNoDebris) && (
                                    <div className="mt-2 bg-blue-50 p-2 rounded">
                                      <p className="text-xs font-medium text-blue-900 mb-1">消火栓专项检查：</p>
                                      {record.hydrantFrontClear && (
                                        <p className="text-xs text-blue-800">• 消火栓前无杂物，箱门无锁闭: {record.hydrantFrontClear}</p>
                                      )}
                                      {record.hydrantBoxAppearance && (
                                        <p className="text-xs text-blue-800">• 箱体外观正常，开度120°以上: {record.hydrantBoxAppearance}</p>
                                      )}
                                      {record.hydrantSignage && (
                                        <p className="text-xs text-blue-800">• 标识、流程图完好: {record.hydrantSignage}</p>
                                      )}
                                      {record.hydrantNoLeakage && (
                                        <p className="text-xs text-blue-800">• 消火栓无渗漏水: {record.hydrantNoLeakage}</p>
                                      )}
                                      {record.hydrantEquipmentComplete && (
                                        <p className="text-xs text-blue-800">• 水带、水枪、按钮完好: {record.hydrantEquipmentComplete}</p>
                                      )}
                                      {record.hydrantHoseCondition && (
                                        <p className="text-xs text-blue-800">• 水带摆放整齐，无老化: {record.hydrantHoseCondition}</p>
                                      )}
                                      {record.hydrantValveCondition && (
                                        <p className="text-xs text-blue-800">• 水枪、接口、阀门完好: {record.hydrantValveCondition}</p>
                                      )}
                                      {record.hydrantReelCondition && (
                                        <p className="text-xs text-blue-800">• 卷盘软管有序，无龟裂: {record.hydrantReelCondition}</p>
                                      )}
                                      {record.hydrantNozzleCondition && (
                                        <p className="text-xs text-blue-800">• 枪头完好，连接紧固: {record.hydrantNozzleCondition}</p>
                                      )}
                                      {record.hydrantNoDebris && (
                                        <p className="text-xs text-blue-800">• 消火栓内无杂物: {record.hydrantNoDebris}</p>
                                      )}
                                    </div>
                                  )}
                                  {/* 灭火器专项检查项 */}
                                  {selectedEquipment.type === "灭火器" && (record.extinguisherConfigCorrect || record.extinguisherWithinExpiration || record.extinguisherCylinderNormal || record.extinguisherNozzleNormal || record.extinguisherPipelineNormal || record.extinguisherSealIntact || record.extinguisherPressureNormal || record.extinguisherCo2WeightNormal) && (
                                    <div className="mt-2 bg-red-50 p-2 rounded">
                                      <p className="text-xs font-medium text-red-900 mb-1">灭火器专项检查：</p>
                                      {record.extinguisherConfigCorrect && (
                                        <p className="text-xs text-red-800">• 配置数量、型号正确: {record.extinguisherConfigCorrect}</p>
                                      )}
                                      {record.extinguisherWithinExpiration && (
                                        <p className="text-xs text-red-800">• 在有效期内: {record.extinguisherWithinExpiration}</p>
                                      )}
                                      {record.extinguisherCylinderNormal && (
                                        <p className="text-xs text-red-800">• 筒体无锈蚀、变形等异常: {record.extinguisherCylinderNormal}</p>
                                      )}
                                      {record.extinguisherNozzleNormal && (
                                        <p className="text-xs text-red-800">• 喷嘴无堵塞、破损等异常: {record.extinguisherNozzleNormal}</p>
                                      )}
                                      {record.extinguisherPipelineNormal && (
                                        <p className="text-xs text-red-800">• 管路无老化、腐蚀等异常: {record.extinguisherPipelineNormal}</p>
                                      )}
                                      {record.extinguisherSealIntact && (
                                        <p className="text-xs text-red-800">• 铅封良好: {record.extinguisherSealIntact}</p>
                                      )}
                                      {record.extinguisherPressureNormal && (
                                        <p className="text-xs text-red-800">• 压力表指针处于绿区（干粉）: {record.extinguisherPressureNormal}</p>
                                      )}
                                      {record.extinguisherCo2WeightNormal && (
                                        <p className="text-xs text-red-800">• CO2称重合格（泄漏≤5%且≤50g）: {record.extinguisherCo2WeightNormal}</p>
                                      )}
                                    </div>
                                  )}
                                  {/* 消防沙专项检查项 */}
                                  {selectedEquipment.type === "消防沙" && record.sandNoCaking && (
                                    <div className="mt-2 bg-amber-50 p-2 rounded">
                                      <p className="text-xs font-medium text-amber-900 mb-1">消防沙专项检查：</p>
                                      {record.sandNoCaking && (
                                        <p className="text-xs text-amber-800">• 铁锹翻动测试，无结块现象: {record.sandNoCaking}</p>
                                      )}
                                    </div>
                                  )}
                                  {record.remarks && (
                                    <p className="text-sm text-gray-600 mt-2">
                                      备注: {record.remarks}
                                    </p>
                                  )}
                                  {record.photoKey && (
                                    <button
                                      onClick={() => {
                                        setPreviewPhotoRecordId(record.id);
                                        setPreviewPhotoUrl(`/api/record-photo?id=${record.id}`);
                                      }}
                                      className="text-sm text-blue-600 hover:underline mt-2 block"
                                    >
                                      查看照片
                                    </button>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleEditRecord(record)}
                                    className="px-3 py-1 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600"
                                  >
                                    编辑
                                  </button>
                                  <button
                                    onClick={() => handleDeleteRecord(record)}
                                    className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                                  >
                                    删除
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 导出对话框 */}
        {showExportDialog && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          >
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">导出巡查记录</h2>

              <div className="space-y-4">
                {/* 物资库选择 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    物资库
                  </label>
                  <select
                    value={exportWarehouseId}
                    onChange={(e) => {
                      setExportWarehouseId(e.target.value);
                      setExportAreaId("");
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">全部物资库</option>
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 区域选择 */}
                {exportWarehouseId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      区域
                    </label>
                    <select
                      value={exportAreaId}
                      onChange={(e) => setExportAreaId(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">全部区域</option>
                      {areas.map((area) => (
                        <option key={area.id} value={area.id}>
                          {area.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 器材类型选择 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    器材类型
                  </label>
                  <select
                    value={exportEquipmentType}
                    onChange={(e) => setExportEquipmentType(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">全部类型</option>
                    <option value="消火栓">消火栓</option>
                    <option value="灭火器">灭火器</option>
                    <option value="消防沙">消防沙</option>
                    <option value="消防架">消防架</option>
                    <option value="防汛">防汛</option>
                    <option value="防寒">防寒</option>
                    <option value="洗眼器">洗眼器</option>
                  </select>
                </div>

                {/* 日期范围 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      开始日期
                    </label>
                    <input
                      type="date"
                      value={exportStartDate}
                      onChange={(e) => setExportStartDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      结束日期
                    </label>
                    <input
                      type="date"
                      value={exportEndDate}
                      onChange={(e) => setExportEndDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* 提交按钮 */}
              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {exporting ? "导出中..." : "导出"}
                </button>
                <button
                  onClick={() => {
                    setShowExportDialog(false);
                    resetExportParams();
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 图片预览模态框 */}
        {previewPhotoUrl && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80"
            onClick={() => {
              setPreviewPhotoUrl("");
              setPreviewPhotoRecordId("");
            }}
          >
            {/* 关闭按钮 */}
            <button
              onClick={() => {
                setPreviewPhotoUrl("");
                setPreviewPhotoRecordId("");
              }}
              className="absolute top-4 right-4 z-[101] w-12 h-12 flex items-center justify-center bg-white/20 hover:bg-white/40 rounded-full text-white text-3xl font-bold transition-colors"
            >
              ×
            </button>
            {/* 图片容器 */}
            <div 
              className="relative max-w-[95vw] max-h-[95vh] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {previewPhotoRecordId && (
                <img
                  src={`/api/record-photo?id=${previewPhotoRecordId}`}
                  alt="照片预览"
                  className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                  style={{ 
                    backgroundColor: 'white',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* 区域管理弹窗 */}
        {showAreaManager && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden">
              {/* 弹窗标题 */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  <span className="font-semibold">区域管理</span>
                </div>
                <button
                  onClick={() => {
                    setShowAreaManager(false);
                    setEditingAreaId("");
                    setEditingAreaName("");
                  }}
                  className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors"
                >
                  ×
                </button>
              </div>

              {/* 区域列表 */}
              <div className="p-4 overflow-y-auto max-h-[calc(80vh-140px)]">
                {areas.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">暂无区域</div>
                ) : (
                  <div className="space-y-2">
                    {areas.map((area) => (
                      <div
                        key={area.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        {editingAreaId === area.id ? (
                          // 编辑模式
                          <>
                            <input
                              type="text"
                              value={editingAreaName}
                              onChange={(e) => setEditingAreaName(e.target.value)}
                              className="flex-1 px-3 py-1.5 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              autoFocus
                            />
                            <div className="flex items-center gap-1 ml-2">
                              <button
                                onClick={() => handleSaveAreaEdit(area.id)}
                                className="px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors"
                              >
                                保存
                              </button>
                              <button
                                onClick={() => {
                                  setEditingAreaId("");
                                  setEditingAreaName("");
                                }}
                                className="px-3 py-1.5 bg-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-400 transition-colors"
                              >
                                取消
                              </button>
                            </div>
                          </>
                        ) : (
                          // 显示模式
                          <>
                            <span className="text-gray-800 font-medium">{area.name}</span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setEditingAreaId(area.id);
                                  setEditingAreaName(area.name);
                                }}
                                className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                title="编辑"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteArea(area.id)}
                                className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                title="删除"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* 添加新区域 */}
                <div className="px-6 py-4 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newAreaName}
                      onChange={(e) => setNewAreaName(e.target.value)}
                      placeholder="输入新区域名称..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                    />
                    <button
                      onClick={handleAddNewArea}
                      disabled={!newAreaName.trim()}
                      className="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      添加区域
                    </button>
                  </div>
                </div>
              </div>

              {/* 底部提示 */}
              <div className="px-6 py-3 bg-gray-50 border-t text-xs text-gray-500">
                提示：删除区域前需先移除该区域下的所有器材和月度检查记录
              </div>
            </div>
          </div>
        )}

        {/* 移动器材弹窗 */}
        {showMoveEquipmentModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span>📦</span> 移动资源
                </h3>
                <button
                  onClick={() => setShowMoveEquipmentModal(false)}
                  className="text-white hover:bg-white/20 rounded-lg p-1"
                >
                  ✕
                </button>
              </div>

              <div className="p-6">
                <div className="mb-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-amber-800 text-sm">
                    ⚠️ 该区域下有以下资源，无法直接删除：
                  </p>
                  <ul className="text-amber-700 text-sm mt-2 list-disc list-inside">
                    {movingEquipmentCount > 0 && (
                      <li><strong>{movingEquipmentCount}</strong> 个器材</li>
                    )}
                    {movingMonthlyCheckCount > 0 && (
                      <li><strong>{movingMonthlyCheckCount}</strong> 条月度检查记录</li>
                    )}
                  </ul>
                  <p className="text-amber-700 text-sm mt-2">
                    请先将这些资源移动到其他区域：
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    选择目标区域：
                  </label>
                  <select
                    value={movingToAreaId}
                    onChange={(e) => setMovingToAreaId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">请选择区域</option>
                    {areas
                      .filter(a => a.id !== movingFromAreaId)
                      .map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                  </select>
                </div>

                {areas.filter(a => a.id !== movingFromAreaId).length === 0 && (
                  <p className="text-red-500 text-sm mb-4">
                    没有其他可用的区域，请先创建新区域
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleMoveEquipments}
                    disabled={!movingToAreaId || areas.filter(a => a.id !== movingFromAreaId).length === 0}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    确认移动并删除区域
                  </button>
                  <button
                    onClick={() => setShowMoveEquipmentModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
