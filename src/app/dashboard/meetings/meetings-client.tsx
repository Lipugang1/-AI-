'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, Plus, Loader2, Save, 
  FileText, Mic, PenTool, Calendar, Clock, Settings,
  UserCheck, UserX, UserMinus, History, CheckCircle2, Download, FileSpreadsheet,
  Building2, LogOut
} from 'lucide-react';

import { SignaturePad } from '@/components/SignaturePad';
import { VoiceChatPanel } from '@/components/VoiceChat';
import { MeetingGuidelines } from '@/components/MeetingGuidelines';
import { TrainingContentManager } from '@/components/TrainingContentManager';
import { TrainingContentViewer } from '@/components/TrainingContentViewer';
import { DepartmentSelector } from '@/components/DepartmentSelector';
import { DepartmentManager } from '@/components/DepartmentManager';
import { useAuth } from '@/hooks/use-auth';
import * as XLSX from 'xlsx';

interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
}

interface Team {
  id: string;
  name: string;
  description: string | null;
}

interface TeamMember {
  id: string;
  team_id: string;
  name: string;
  location: string | null;
  position: string | null;
  is_leader: boolean;
}

interface Participant {
  id: string;
  member_id: string | null;
  name: string;
  location: string | null;
  attendance_status: string;
  attendance_type: string;
  signature_url: string | null;
  signed_at: string | null;
  leave_reason: string | null;
}

interface Meeting {
  id: string;
  team_id: string | null;
  department_id: string;
  date: string;
  status: string;
  teams?: { id: string; name: string } | null;
}

interface MeetingRecord {
  id: string;
  meeting_id: string;
  audio_url: string;
  transcript: string;
  summary: any;
  created_at: string;
}

interface MeetingWithRecord extends Meeting {
  participants?: Participant[];
  meeting_records?: MeetingRecord[];
}

// 出勤状态配置
const ATTENDANCE_STATUS = {
  pending: { label: '待签到', color: 'secondary' },
  present: { label: '已出勤', color: 'default' },
  leave: { label: '请假', color: 'outline' },
  absent: { label: '缺勤', color: 'destructive' },
};

export function MeetingsClient() {
  const { user } = useAuth();

  // 部门相关
  const [currentDepartment, setCurrentDepartment] = useState<Department | null>(null);
  const [showDepartmentManager, setShowDepartmentManager] = useState(false);
  
  // 班组相关
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  
  // 会议相关
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [meetingRecord, setMeetingRecord] = useState<MeetingRecord | null>(null);
  const [loading, setLoading] = useState(false);
  
  // AI处理
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [audioUrl, setAudioUrl] = useState(''); // 录音文件URL
  const [processingAI, setProcessingAI] = useState(false);
  
  // 签名状态
  const [signingParticipant, setSigningParticipant] = useState<Participant | null>(null);
  
  // 弹窗状态
  const [showTeamDialog, setShowTeamDialog] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  
  // 编辑班组状态
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [showEditTeamDialog, setShowEditTeamDialog] = useState(false);
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamDesc, setEditTeamDesc] = useState('');
  
  const [showMemberDialog, setShowMemberDialog] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberLocation, setNewMemberLocation] = useState('');
  const [newMemberPosition, setNewMemberPosition] = useState('');
  const [newMemberIsLeader, setNewMemberIsLeader] = useState(false);
  
  // 编辑成员状态
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [showEditMemberDialog, setShowEditMemberDialog] = useState(false);
  
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [leaveParticipantId, setLeaveParticipantId] = useState<string>('');
  const [leaveReason, setLeaveReason] = useState('');
  
  // 历史记录相关
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [historyMeetings, setHistoryMeetings] = useState<MeetingWithRecord[]>([]);
  const [selectedHistoryMeeting, setSelectedHistoryMeeting] = useState<MeetingWithRecord | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // 编辑会议记录相关
  const [editingRecord, setEditingRecord] = useState<MeetingRecord | null>(null);
  const [showEditRecordDialog, setShowEditRecordDialog] = useState(false);
  const [editTranscript, setEditTranscript] = useState('');
  const [editSummary, setEditSummary] = useState('');
  
  // 当前视图：'signin' 参会人员签到 | 'manage' 工班长管理
  const [currentView, setCurrentView] = useState<'signin' | 'manage'>('signin');

  // 发起会议 - 人员选择
  const [showMemberSelectDialog, setShowMemberSelectDialog] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  // 全局录音状态 - 用于跨 Tab 保持录音状态
  const [isRecordingGlobal, setIsRecordingGlobal] = useState(false);
  const [recordingTimeGlobal, setRecordingTimeGlobal] = useState(0);
  const [recordingBlobGlobal, setRecordingBlobGlobal] = useState<Blob | null>(null);
  const mediaRecorderGlobalRef = useRef<MediaRecorder | null>(null);
  const audioChunksGlobalRef = useRef<Blob[]>([]);
  const timerGlobalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 全局录音控制函数
  const startGlobalRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderGlobalRef.current = mediaRecorder;
      audioChunksGlobalRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksGlobalRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksGlobalRef.current, { type: 'audio/webm' });
        // 停止所有轨道
        stream.getTracks().forEach(track => track.stop());
        
        // 直接处理 blob，不要等待状态更新
        try {
          const base64 = await blobToBase64(audioBlob);
          handleAudioReady(audioBlob, base64);
        } catch (error) {
          console.error('处理录音失败:', error);
          alert('录音处理失败，请重试');
        }
      };

      mediaRecorder.start();
      setIsRecordingGlobal(true);
      setRecordingTimeGlobal(0);

      timerGlobalRef.current = setInterval(() => {
        setRecordingTimeGlobal(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('启动录音失败:', error);
      alert('无法访问麦克风，请检查权限设置');
    }
  };

  // 将 Blob 转换为 base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const stopGlobalRecording = () => {
    if (mediaRecorderGlobalRef.current && isRecordingGlobal) {
      mediaRecorderGlobalRef.current.stop();
      setIsRecordingGlobal(false);
      if (timerGlobalRef.current) {
        clearInterval(timerGlobalRef.current);
      }
      // 实际的录音处理在 mediaRecorder.onstop 回调中完成
    }
  };

  // 加载班组列表
  const loadTeams = useCallback(async (departmentId?: string) => {
    try {
      let url = '/api/teams';
      if (departmentId) {
        url += `?departmentId=${departmentId}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setTeams(data.teams || []);
    } catch (error) {
      console.error('加载班组失败:', error);
    }
  }, []);

  // 加载班组成员
  const loadTeamMembers = useCallback(async (teamId: string) => {
    try {
      const res = await fetch(`/api/team-members?team_id=${teamId}`);
      const data = await res.json();
      setTeamMembers(data.members || []);
    } catch (error) {
      console.error('加载班组成员失败:', error);
    }
  }, []);

  // 加载今日会议
  const loadMeeting = useCallback(async (teamId?: string, departmentId?: string) => {
    setLoading(true);
    try {
      let url = '/api/meeting';
      const params = new URLSearchParams();
      if (teamId) params.append('team_id', teamId);
      if (departmentId) params.append('departmentId', departmentId);
      if (params.toString()) url += '?' + params.toString();
      
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.meeting) {
        setMeeting(data.meeting);
        await loadParticipants(data.meeting.id);
        await loadMeetingRecord(data.meeting.id);
      } else {
        setMeeting(null);
        setParticipants([]);
        setMeetingRecord(null);
        setTranscript('');
        setSummary('');
      }
    } catch (error) {
      console.error('加载会议失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadParticipants = async (meetingId: string) => {
    try {
      const res = await fetch(`/api/participants?meeting_id=${meetingId}`);
      const data = await res.json();
      setParticipants(data.participants || []);
    } catch (error) {
      console.error('加载参会人员失败:', error);
    }
  };

  const loadMeetingRecord = async (meetingId: string) => {
    try {
      const res = await fetch(`/api/meeting-record?meeting_id=${meetingId}`);
      const data = await res.json();
      if (data.records && data.records.length > 0) {
        setMeetingRecord(data.records[0]);
        setTranscript(data.records[0].transcript || '');
        setAudioUrl(data.records[0].audio_url || '');
        if (data.records[0].summary) {
          setSummary(typeof data.records[0].summary === 'string' 
            ? data.records[0].summary 
            : JSON.stringify(data.records[0].summary, null, 2));
        }
      } else {
        setMeetingRecord(null);
        setTranscript('');
        setSummary('');
        setAudioUrl('');
      }
    } catch (error) {
      console.error('加载会议记录失败:', error);
    }
  };

  // 加载历史会议记录
  const loadHistoryMeetings = async (teamId?: string, departmentId?: string) => {
    setLoadingHistory(true);
    try {
      let url = '/api/meeting/history';
      const params = new URLSearchParams();
      if (teamId) params.append('team_id', teamId);
      if (departmentId) params.append('departmentId', departmentId);
      if (params.toString()) url += '?' + params.toString();
      
      const res = await fetch(url);
      const data = await res.json();
      setHistoryMeetings(data.meetings || []);
    } catch (error) {
      console.error('加载历史记录失败:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (currentDepartment) {
      loadTeams(currentDepartment.id);
    }
  }, [currentDepartment, loadTeams]);

  useEffect(() => {
    if (selectedTeamId) {
      loadTeamMembers(selectedTeamId);
      loadMeeting(selectedTeamId, currentDepartment?.id);
    } else {
      setLoading(false);
      setTeamMembers([]);
      setMeeting(null);
      setParticipants([]);
    }
  }, [selectedTeamId, currentDepartment, loadTeamMembers, loadMeeting]);

  // 创建班组
  const createTeam = async () => {
    if (!newTeamName.trim()) {
      alert('请输入班组名称');
      return;
    }

    if (!currentDepartment) {
      alert('请先选择部门');
      return;
    }

    try {
      const res = await fetch('/api/teams', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newTeamName, 
          description: newTeamDesc,
          departmentId: currentDepartment.id 
        }),
      });
      
      const data = await res.json();
      if (data.team) {
        setTeams([...teams, data.team]);
        setNewTeamName('');
        setNewTeamDesc('');
        setShowTeamDialog(false);
        setSelectedTeamId(data.team.id);
        alert('班组创建成功！');
      } else {
        alert(data.error || '创建班组失败');
      }
    } catch (error) {
      console.error('创建班组失败:', error);
      alert('创建班组失败，请重试');
    }
  };

  // 编辑班组
  const updateTeam = async () => {
    if (!editingTeam) return;
    if (!editTeamName.trim()) {
      alert('请输入班组名称');
      return;
    }

    try {
      const res = await fetch(`/api/teams?id=${editingTeam.id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editTeamName, description: editTeamDesc }),
      });
      
      const data = await res.json();
      if (data.team) {
        setTeams(teams.map(t => t.id === data.team.id ? data.team : t));
        setEditingTeam(null);
        setShowEditTeamDialog(false);
        alert('班组更新成功！');
      } else {
        alert(data.error || '更新班组失败');
      }
    } catch (error) {
      console.error('更新班组失败:', error);
      alert('更新班组失败，请重试');
    }
  };

  // 删除班组
  const deleteTeam = async (teamId: string, teamName: string) => {
    if (!confirm(`确定要删除班组"${teamName}"吗？\n\n删除后将同时删除：\n• 班组成员\n• 相关会议记录\n• 签名和录音数据\n\n此操作不可恢复！`)) return;

    try {
      const res = await fetch(`/api/teams?id=${teamId}`, {
        method: 'DELETE', credentials: 'include',
      });
      
      const data = await res.json();
      if (data.success) {
        setTeams(teams.filter(t => t.id !== teamId));
        if (selectedTeamId === teamId) {
          setSelectedTeamId('');
        }
        alert('班组删除成功！');
      } else {
        alert(data.error || '删除班组失败');
      }
    } catch (error) {
      console.error('删除班组失败:', error);
      alert('删除班组失败，请重试');
    }
  };

  // 打开编辑班组弹窗
  const openEditTeamDialog = (team: Team) => {
    setEditingTeam(team);
    setEditTeamName(team.name);
    setEditTeamDesc(team.description || '');
    setShowEditTeamDialog(true);
  };

  // 添加班组成员
  const addTeamMember = async () => {
    if (!selectedTeamId) {
      alert('请先选择班组');
      return;
    }
    if (!newMemberName.trim()) {
      alert('请输入成员姓名');
      return;
    }

    try {
      // 添加到班组成员表
      const res = await fetch('/api/team-members', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: selectedTeamId,
          name: newMemberName,
          location: newMemberLocation,
          position: newMemberPosition,
          isLeader: newMemberIsLeader,
        }),
      });
      
      const data = await res.json();
      if (data.member) {
        // 刷新班组成员列表
        await loadTeamMembers(selectedTeamId);
        
        // 如果当前有会议进行中，同时添加到参会列表
        if (meeting && meeting.status === 'ongoing') {
          const participantRes = await fetch('/api/participants', {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              meetingId: meeting.id,
              memberId: data.member.id,
              name: data.member.name,
              location: data.member.location,
            }),
          });
          const participantData = await participantRes.json();
          if (participantData.participant) {
            await loadParticipants(meeting.id);
          }
        }
        
        setNewMemberName('');
        setNewMemberLocation('');
        setNewMemberPosition('');
        setNewMemberIsLeader(false);
        setShowMemberDialog(false);
        alert('添加成功！');
      } else {
        alert(data.error || '添加失败');
      }
    } catch (error) {
      console.error('添加成员失败:', error);
      alert('添加成员失败，请重试');
    }
  };

  // 删除班组成员
  const deleteTeamMember = async (memberId: string, memberName: string) => {
    if (!confirm(`确定要删除成员"${memberName}"吗？`)) return;

    try {
      const res = await fetch(`/api/team-members/${memberId}`, {
        method: 'DELETE', credentials: 'include',
      });
      
      const data = await res.json();
      if (data.success) {
        await loadTeamMembers(selectedTeamId);
        alert('删除成功！');
      } else {
        alert(data.error || '删除失败');
      }
    } catch (error) {
      console.error('删除成员失败:', error);
      alert('删除成员失败，请重试');
    }
  };

  // 打开编辑成员弹窗
  const openEditMemberDialog = (member: TeamMember) => {
    setEditingMember(member);
    setNewMemberName(member.name);
    setNewMemberLocation(member.location || '');
    setNewMemberPosition(member.position || '');
    setNewMemberIsLeader(member.is_leader);
    setShowEditMemberDialog(true);
  };

  // 编辑班组成员
  const updateTeamMember = async () => {
    if (!editingMember) return;
    if (!newMemberName.trim()) {
      alert('请输入成员姓名');
      return;
    }

    try {
      const res = await fetch(`/api/team-members/${editingMember.id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newMemberName,
          location: newMemberLocation,
          position: newMemberPosition,
          isLeader: newMemberIsLeader,
        }),
      });
      
      const data = await res.json();
      if (data.member) {
        await loadTeamMembers(selectedTeamId);
        setEditingMember(null);
        setNewMemberName('');
        setNewMemberLocation('');
        setNewMemberPosition('');
        setNewMemberIsLeader(false);
        setShowEditMemberDialog(false);
        alert('修改成功！');
      } else {
        alert(data.error || '修改失败');
      }
    } catch (error) {
      console.error('修改成员失败:', error);
      alert('修改成员失败，请重试');
    }
  };

  // 打开人员选择弹窗
  const openMemberSelectDialog = () => {
    // 默认选中所有成员
    setSelectedMemberIds(teamMembers.map(m => m.id));
    setShowMemberSelectDialog(true);
  };

  // 全选/取消全选成员
  const toggleSelectAllMembers = () => {
    if (selectedMemberIds.length === teamMembers.length) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(teamMembers.map(m => m.id));
    }
  };

  // 切换单个成员选择
  const toggleMemberSelection = (memberId: string) => {
    setSelectedMemberIds(prev => 
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  // 确认发起会议（带选中的成员）
  const confirmStartMeeting = async () => {
    if (!currentDepartment) {
      alert('请先选择部门');
      return;
    }

    if (selectedMemberIds.length === 0) {
      alert('请至少选择一位参会人员');
      return;
    }

    setShowMemberSelectDialog(false);

    // 重置会议记录状态
    setMeetingRecord(null);
    setTranscript('');
    setSummary('');
    setAudioUrl('');

    try {
      const res = await fetch('/api/meeting', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          teamId: selectedTeamId || null,
          departmentId: currentDepartment.id,
          selectedMemberIds: selectedMemberIds,
        }),
      });
      
      const data = await res.json();
      
      if (data.meeting) {
        setMeeting(data.meeting);
        await loadParticipants(data.meeting.id);
      } else {
        alert(data.error || '创建会议失败');
      }
    } catch (error) {
      console.error('创建会议失败:', error);
      alert('创建会议失败');
    }
  };

  // 创建会议（无人员选择，直接创建）
  const createMeeting = async () => {
    if (!currentDepartment) {
      alert('请先选择部门');
      return;
    }

    // 重置会议记录状态
    setMeetingRecord(null);
    setTranscript('');
    setSummary('');
    setAudioUrl('');

    try {
      const res = await fetch('/api/meeting', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          teamId: selectedTeamId || null,
          departmentId: currentDepartment.id 
        }),
      });
      
      const data = await res.json();
      
      if (data.meeting) {
        setMeeting(data.meeting);
        await loadParticipants(data.meeting.id);
      } else {
        alert(data.error || '创建会议失败');
      }
    } catch (error) {
      console.error('创建会议失败:', error);
      alert('创建会议失败');
    }
  };

  // 参会人员签到（签名确认出勤）
  const signInParticipant = (participant: Participant) => {
    setSigningParticipant(participant);
  };

  // 处理签名
  const handleSignature = async (signatureDataUrl: string) => {
    if (!signingParticipant) return;

    try {
      const res = await fetch(`/api/participants/${signingParticipant.id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          signatureUrl: signatureDataUrl,
          attendanceStatus: 'present',
        }),
      });
      
      const data = await res.json();
      if (data.participant) {
        // 使用函数式更新确保状态正确更新
        setParticipants(prev => prev.map(p => 
          p.id === signingParticipant.id ? { ...p, ...data.participant } : p
        ));
        setSigningParticipant(null);
      }
    } catch (error) {
      console.error('保存签名失败:', error);
    }
  };

  // 工班长标记请假/缺勤
  const markAttendance = async (participantId: string, status: string, reason?: string) => {
    try {
      const updateData: any = { attendanceStatus: status };
      if (reason) {
        updateData.leaveReason = reason;
      }

      const res = await fetch(`/api/participants/${participantId}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      
      const data = await res.json();
      if (data.participant) {
        // 使用函数式更新确保状态正确更新
        setParticipants(prev => prev.map(p => 
          p.id === participantId ? { ...p, ...data.participant } : p
        ));
      }
    } catch (error) {
      console.error('更新出勤状态失败:', error);
    }
  };

  // 打开请假原因弹窗
  const openLeaveDialog = (participantId: string) => {
    setLeaveParticipantId(participantId);
    setLeaveReason('');
    setShowLeaveDialog(true);
  };

  // 确认请假
  const confirmLeave = async () => {
    await markAttendance(leaveParticipantId, 'leave', leaveReason);
    setShowLeaveDialog(false);
  };

  // 处理音频
  const handleAudioReady = async (audioBlob: Blob, audioBase64: string) => {
    if (!meeting) return;

    // 保存返回的记录ID，供后续更新总结使用
    let savedRecordId: string | null = meetingRecord?.id || null;

    try {
      setProcessingAI(true);
      
      const asrRes = await fetch('/api/asr', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64 }),
      });
      
      const asrData = await asrRes.json();
      if (asrData.text) {
        setTranscript(asrData.text);
        
        // 保存录音文件URL
        if (asrData.audioUrl) {
          setAudioUrl(asrData.audioUrl);
        }
        
        // 自动保存会议记录（不含总结）
        try {
          const recordData = {
            meetingId: meeting.id,
            audioUrl: asrData.audioUrl || audioUrl,
            transcript: asrData.text,
            summary: '',
          };

          let saveRes;
          if (savedRecordId) {
            // 已有记录，更新
            saveRes = await fetch('/api/meeting-record', {
              method: 'PATCH', credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                id: savedRecordId,
                ...recordData,
              }),
            });
          } else {
            // 新建记录
            saveRes = await fetch('/api/meeting-record', {
              method: 'POST', credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(recordData),
            });
          }

          const saveData = await saveRes.json();
          if (saveData.record) {
            setMeetingRecord(saveData.record);
            savedRecordId = saveData.record.id;
            console.log('语音识别文本已保存，ID:', savedRecordId);
          } else if (saveData.records?.[0]) {
            // 如果返回的是 records 数组
            setMeetingRecord(saveData.records[0]);
            savedRecordId = saveData.records[0].id;
            console.log('语音识别文本已保存，ID:', savedRecordId);
          }
        } catch (saveError) {
          console.error('保存会议记录失败:', saveError);
        }

        // 获取会议总结
        const participantNames = participants
          .filter(p => p.attendance_status === 'present')
          .map(p => p.name);
        const summaryRes = await fetch('/api/summarize', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            transcript: asrData.text,
            participantNames,
          }),
        });
        
        const summaryData = await summaryRes.json();
        if (summaryData.summary) {
          setSummary(summaryData.summary);
          
          // 用局部变量 savedRecordId 更新总结
          if (savedRecordId) {
            try {
              await fetch('/api/meeting-record', {
                method: 'PATCH', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  id: savedRecordId,
                  summary: summaryData.summary,
                }),
              });
              console.log('会议总结已更新保存');
            } catch (updateError) {
              console.error('更新会议总结失败:', updateError);
            }
          }
        }
        
        // 显示警告（如果有）
        if (asrData.warning) {
          console.warn('ASR Warning:', asrData.warning);
        }
      } else if (asrData.error) {
        // 错误消息可能包含敏感链接，不显示给用户
        alert('语音识别失败，请重试');
      } else {
        alert('语音识别未返回有效结果，请重试');
      }
    } catch (error) {
      console.error('处理音频失败:', error);
      alert('语音识别或AI总结失败');
    } finally {
      setProcessingAI(false);
    }
  };

  // 保存会议记录
  const saveMeetingRecord = async () => {
    if (!meeting) return;

    try {
      const recordData = {
        meetingId: meeting.id,
        audioUrl,
        transcript,
        summary,
      };

      const method = meetingRecord ? 'PATCH' : 'POST';
      const body = meetingRecord 
        ? { ...recordData, id: meetingRecord.id }
        : recordData;

      const res = await fetch('/api/meeting-record', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.record) {
        alert('保存成功！');
        setMeetingRecord(data.record);
      }
    } catch (error) {
      console.error('保存会议记录失败:', error);
      alert('保存失败');
    }
  };

  // 结束会议
  const endMeeting = async () => {
    if (!meeting) return;
    if (!confirm('确定要结束会议吗？')) return;

    try {
      const res = await fetch(`/api/meeting/${meeting.id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      
      const data = await res.json();
      if (data.meeting) {
        setMeeting(data.meeting);
        alert('会议已结束');
      }
    } catch (error) {
      console.error('结束会议失败:', error);
    }
  };

  // 统计出勤情况
  const getAttendanceStats = () => ({
    total: participants.length,
    present: participants.filter(p => p.attendance_status === 'present').length,
    leave: participants.filter(p => p.attendance_status === 'leave').length,
    absent: participants.filter(p => p.attendance_status === 'absent').length,
    pending: participants.filter(p => p.attendance_status === 'pending').length,
  });

  // 打开历史记录弹窗
  const openHistoryDialog = () => {
    loadHistoryMeetings(selectedTeamId, currentDepartment?.id);
    setShowHistoryDialog(true);
  };

  // 查看历史会议详情
  const viewHistoryMeetingDetail = async (meetingItem: MeetingWithRecord) => {
    try {
      const res = await fetch(`/api/meeting/${meetingItem.id}`);
      const data = await res.json();
      setSelectedHistoryMeeting({
        ...meetingItem,
        participants: data.participants,
        meeting_records: data.records,
      });
    } catch (error) {
      console.error('加载会议详情失败:', error);
    }
  };

  // 删除会议记录
  const deleteMeeting = async (meetingId: string, meetingDate: string) => {
    if (!confirm(`确定要删除 ${meetingDate} 的会议记录吗？此操作不可恢复！`)) return;

    try {
      const res = await fetch(`/api/meeting/${meetingId}`, {
        method: 'DELETE', credentials: 'include',
      });
      
      const data = await res.json();
      if (data.success) {
        // 从列表中移除
        setHistoryMeetings(prev => prev.filter(m => m.id !== meetingId));
        // 如果正在查看这个会议，关闭详情
        if (selectedHistoryMeeting?.id === meetingId) {
          setSelectedHistoryMeeting(null);
        }
        alert('删除成功！');
      } else {
        alert(data.error || '删除失败');
      }
    } catch (error) {
      console.error('删除会议失败:', error);
      alert('删除会议失败，请重试');
    }
  };

  // 打开编辑会议记录弹窗
  const openEditRecordDialog = (record: MeetingRecord) => {
    setEditingRecord(record);
    setEditTranscript(record.transcript || '');
    setEditSummary(typeof record.summary === 'string' ? record.summary : JSON.stringify(record.summary || {}, null, 2));
    setShowEditRecordDialog(true);
  };

  // 保存编辑的会议记录
  const saveEditRecord = async () => {
    if (!editingRecord) return;

    try {
      const res = await fetch(`/api/meeting-records/${editingRecord.id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: editTranscript,
          summary: editSummary,
        }),
      });
      
      const data = await res.json();
      if (data.record) {
        // 更新选中的会议记录
        if (selectedHistoryMeeting) {
          setSelectedHistoryMeeting({
            ...selectedHistoryMeeting,
            meeting_records: selectedHistoryMeeting.meeting_records?.map(r => 
              r.id === editingRecord.id ? { ...r, transcript: editTranscript, summary: editSummary } : r
            ),
          });
        }
        // 更新历史列表中的记录
        setHistoryMeetings(prev => prev.map(m => {
          if (m.id === selectedHistoryMeeting?.id) {
            return {
              ...m,
              meeting_records: m.meeting_records?.map(r => 
                r.id === editingRecord.id ? { ...r, transcript: editTranscript, summary: editSummary } : r
              ),
            };
          }
          return m;
        }));
        setShowEditRecordDialog(false);
        setEditingRecord(null);
        alert('保存成功！');
      } else {
        alert(data.error || '保存失败');
      }
    } catch (error) {
      console.error('保存会议记录失败:', error);
      alert('保存会议记录失败，请重试');
    }
  };

  // 下载录音文件
  const downloadAudio = async (audioUrl: string, meetingDate: string) => {
    try {
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `会议录音_${meetingDate}.webm`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('下载录音失败:', error);
      alert('下载录音失败，请重试');
    }
  };

  // 下载签名图片
  const downloadSignature = async (signatureUrl: string, participantName: string) => {
    try {
      // 如果是 base64 数据，直接下载
      if (signatureUrl.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = signatureUrl;
        link.download = `${participantName}_签名.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // 如果是 URL，使用 fetch 下载
        const response = await fetch(signatureUrl);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${participantName}_签名.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      }
    } catch (error) {
      console.error('下载签名失败:', error);
      alert('下载签名失败，请重试');
    }
  };

  // 导出历史会议记录为Excel
  const exportToExcel = () => {
    if (historyMeetings.length === 0) {
      alert('暂无历史记录可导出');
      return;
    }

    // 准备导出数据
    const exportData: any[] = [];

    historyMeetings.forEach(meeting => {
      const meetingDate = meeting.date;
      const teamName = meeting.teams?.name || '未知班组';
      const meetingStatus = meeting.status === 'completed' ? '已结束' : '进行中';
      
      // 会议基本信息行
      exportData.push({
        '会议日期': meetingDate,
        '班组': teamName,
        '会议状态': meetingStatus,
        '姓名': '',
        '办公地点': '',
        '出勤状态': '',
        '参会方式': '',
        '签字时间': '',
        '请假原因': '',
        '会议总结': meeting.meeting_records?.[0]?.summary 
          ? (typeof meeting.meeting_records[0].summary === 'string' 
              ? meeting.meeting_records[0].summary 
              : JSON.stringify(meeting.meeting_records[0].summary))
          : '',
      });

      // 参会人员信息
      meeting.participants?.forEach(p => {
        const statusMap: Record<string, string> = {
          'pending': '待签到',
          'present': '已出勤',
          'leave': '请假',
          'absent': '缺勤'
        };
        const typeMap: Record<string, string> = {
          'onsite': '现场参会',
          'online': '线上参会'
        };
        
        exportData.push({
          '会议日期': '',
          '班组': '',
          '会议状态': '',
          '姓名': p.name,
          '办公地点': p.location || '',
          '出勤状态': statusMap[p.attendance_status] || p.attendance_status,
          '参会方式': typeMap[p.attendance_type] || p.attendance_type,
          '签字时间': p.signed_at ? new Date(p.signed_at).toLocaleString('zh-CN') : '',
          '请假原因': p.leave_reason || '',
          '会议总结': '',
        });
      });

      // 添加空行分隔不同会议
      exportData.push({
        '会议日期': '',
        '班组': '',
        '会议状态': '',
        '姓名': '',
        '办公地点': '',
        '出勤状态': '',
        '参会方式': '',
        '签字时间': '',
        '请假原因': '',
        '会议总结': '',
      });
    });

    // 创建工作簿
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // 设置列宽
    ws['!cols'] = [
      { wch: 12 }, // 会议日期
      { wch: 15 }, // 班组
      { wch: 10 }, // 会议状态
      { wch: 10 }, // 姓名
      { wch: 15 }, // 办公地点
      { wch: 10 }, // 出勤状态
      { wch: 10 }, // 参会方式
      { wch: 20 }, // 签字时间
      { wch: 20 }, // 请假原因
      { wch: 50 }, // 会议总结
    ];

    XLSX.utils.book_append_sheet(wb, ws, '会议记录');

    // 生成文件名
    const today = new Date().toISOString().split('T')[0];
    const fileName = `会议记录导出_${today}.xlsx`;

    // 下载文件
    XLSX.writeFile(wb, fileName);
  };

  // 导出单个会议详情为Excel
  const exportMeetingDetailToExcel = (meeting: MeetingWithRecord) => {
    const statusMap: Record<string, string> = {
      'pending': '待签到',
      'present': '已出勤',
      'leave': '请假',
      'absent': '缺勤'
    };
    const typeMap: Record<string, string> = {
      'onsite': '现场参会',
      'online': '线上参会'
    };

    // 参会人员数据
    const participantsData = meeting.participants?.map(p => ({
      '姓名': p.name,
      '办公地点': p.location || '',
      '出勤状态': statusMap[p.attendance_status] || p.attendance_status,
      '参会方式': typeMap[p.attendance_type] || p.attendance_type,
      '签字时间': p.signed_at ? new Date(p.signed_at).toLocaleString('zh-CN') : '',
      '请假原因': p.leave_reason || '',
    })) || [];

    // 创建工作簿
    const wb = XLSX.utils.book_new();

    // 参会人员表
    const wsParticipants = XLSX.utils.json_to_sheet(participantsData);
    wsParticipants['!cols'] = [
      { wch: 10 }, // 姓名
      { wch: 15 }, // 办公地点
      { wch: 10 }, // 出勤状态
      { wch: 10 }, // 参会方式
      { wch: 20 }, // 签字时间
      { wch: 20 }, // 请假原因
    ];
    XLSX.utils.book_append_sheet(wb, wsParticipants, '参会人员');

    // 会议总结表
    if (meeting.meeting_records?.[0]?.summary) {
      const summaryData = [
        { '项目': '会议日期', '内容': meeting.date },
        { '项目': '班组', '内容': meeting.teams?.name || '' },
        { '项目': '会议状态', '内容': meeting.status === 'completed' ? '已结束' : '进行中' },
        { '项目': '', '内容': '' },
        { '项目': '会议总结', '内容': '' },
        { '项目': '', '内容': typeof meeting.meeting_records[0].summary === 'string' 
          ? meeting.meeting_records[0].summary 
          : JSON.stringify(meeting.meeting_records[0].summary, null, 2) },
      ];
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      wsSummary['!cols'] = [{ wch: 12 }, { wch: 80 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, '会议总结');
    }

    // 语音识别文本表
    if (meeting.meeting_records?.[0]?.transcript) {
      const transcriptData = [
        { '项目': '语音识别文本', '内容': '' },
        { '项目': '', '内容': meeting.meeting_records[0].transcript },
      ];
      const wsTranscript = XLSX.utils.json_to_sheet(transcriptData);
      wsTranscript['!cols'] = [{ wch: 15 }, { wch: 100 }];
      XLSX.utils.book_append_sheet(wb, wsTranscript, '语音识别');
    }

    // 下载文件
    const fileName = `会议详情_${meeting.date}_${meeting.teams?.name || ''}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // 处理部门选择
  const handleDepartmentSelect = (department: Department, remember: boolean) => {
    setCurrentDepartment(department);
  };

  // 切换部门
  const handleSwitchDepartment = () => {
    setCurrentDepartment(null);
    setSelectedTeamId('');
    setTeams([]);
    setMeeting(null);
    setParticipants([]);
  };

  // 如果没有选择部门，显示部门选择器
  if (!currentDepartment) {
    return (
      <DepartmentSelector 
        onSelect={handleDepartmentSelect}
        userDepartmentId={user?.department_id}
        userRole={user?.role}
      />
    );
  }

  if (loading && teams.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const stats = getAttendanceStats();
  const pendingParticipants = participants.filter(p => p.attendance_status === 'pending');
  const completedParticipants = participants.filter(p => p.attendance_status !== 'pending');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      {/* 顶部装饰条 */}
      <div className="h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-500" />
      
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* 页面标题 */}
        <div className="text-center py-4 sm:py-6">
          <div className="inline-flex items-center justify-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
              <Calendar className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-700 bg-clip-text text-transparent">
              智能晨会管理系统
            </h1>
          </div>
          {/* 部门信息显示 */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1">
              <Building2 className="w-3.5 h-3.5 mr-1" />
              {currentDepartment.name}
            </Badge>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSwitchDepartment}
              className="text-xs text-gray-500 hover:text-gray-700 h-7"
            >
              <LogOut className="w-3 h-3 mr-1" />
              切换部门
            </Button>
          </div>
          <p className="text-slate-500 text-sm sm:text-base flex items-center justify-center gap-2">
            <Clock className="h-4 w-4" />
            {new Date().toLocaleDateString('zh-CN', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              weekday: 'long'
            })}
          </p>
        </div>

        {/* 班组选择 */}
        <Card className="max-w-2xl mx-auto shadow-lg border-slate-200/60 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="flex-1">
                <Label className="text-sm font-medium text-slate-600 mb-1.5 block">选择班组</Label>
                <Select 
                  value={selectedTeamId} 
                  onValueChange={(newTeamId) => {
                    // 如果当前有进行中的会议，提示用户
                    if (meeting && meeting.status === 'ongoing') {
                      if (confirm('当前有会议进行中，切换班组将结束当前会议。是否确定切换？')) {
                        setSelectedTeamId(newTeamId);
                      }
                    } else {
                      setSelectedTeamId(newTeamId);
                    }
                  }}
                >
                  <SelectTrigger className="mt-0 h-11 border-slate-200 hover:border-blue-300 focus:border-blue-400 transition-colors">
                    <SelectValue placeholder="请选择班组开始会议" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2 sm:gap-3">
                <Dialog open={showTeamDialog} onOpenChange={setShowTeamDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                      <Settings className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">管理班组</span>
                      <span className="sm:hidden">管理</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-3 sm:p-6">
                    <DialogHeader className="pb-2">
                      <DialogTitle className="text-lg sm:text-xl">系统设置</DialogTitle>
                    </DialogHeader>
                    <Tabs defaultValue="teams" className="w-full">
                      <TabsList className="grid w-full grid-cols-3 mb-4">
                        <TabsTrigger value="departments" className="gap-1">
                          <Building2 className="w-4 h-4" />
                          <span className="hidden sm:inline">部门管理</span>
                        </TabsTrigger>
                        <TabsTrigger value="teams" className="gap-1">
                          <Users className="w-4 h-4" />
                          <span className="hidden sm:inline">班组管理</span>
                        </TabsTrigger>
                        <TabsTrigger value="training" className="gap-1">
                          <FileText className="w-4 h-4" />
                          <span className="hidden sm:inline">培训内容</span>
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="departments">
                        <DepartmentManager />
                      </TabsContent>
                      
                      <TabsContent value="teams">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm text-gray-600">
                              当前部门：<span className="font-medium text-blue-600">{currentDepartment.name}</span>
                            </Label>
                          </div>
                          {/* 班组列表 */}
                          <div>
                            <Label className="text-sm text-gray-600 mb-2 block">已有班组</Label>
                            {teams.length === 0 ? (
                              <div className="text-center py-4 text-gray-500 text-sm">暂无班组</div>
                            ) : (
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {teams.map(team => (
                                  <div key={team.id} className="flex items-center justify-between p-2 rounded border bg-white">
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium truncate">{team.name}</div>
                                      {team.description && (
                                        <div className="text-xs text-gray-500 truncate">{team.description}</div>
                                      )}
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-7 w-7 p-0" 
                                    onClick={() => {
                                      setShowTeamDialog(false);
                                      openEditTeamDialog(team);
                                    }} 
                                    title="编辑"
                                  >
                                    ✏️
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-7 w-7 p-0 text-red-500 hover:text-red-700" 
                                    onClick={() => {
                                      setShowTeamDialog(false);
                                      deleteTeam(team.id, team.name);
                                    }} 
                                    title="删除"
                                  >
                                    🗑️
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="border-t pt-4">
                        <Label className="text-sm text-gray-600 mb-2 block">创建新班组</Label>
                        <div className="space-y-2">
                          <Input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="班组名称" />
                          <Input value={newTeamDesc} onChange={(e) => setNewTeamDesc(e.target.value)} placeholder="班组描述（可选）" />
                          <Button onClick={createTeam} className="w-full" disabled={!newTeamName.trim()}>
                            创建班组
                          </Button>
                        </div>
                      </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="training">
                        <TrainingContentManager 
                          departmentId={currentDepartment.id} 
                          departmentName={currentDepartment.name} 
                        />
                      </TabsContent>
                    </Tabs>
                  </DialogContent>
                </Dialog>
                
                {/* 编辑班组弹窗 */}
                <Dialog open={showEditTeamDialog} onOpenChange={setShowEditTeamDialog}>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>编辑班组</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div>
                        <Label>班组名称</Label>
                        <Input value={editTeamName} onChange={(e) => setEditTeamName(e.target.value)} placeholder="请输入班组名称" />
                      </div>
                      <div>
                        <Label>班组描述（可选）</Label>
                        <Input value={editTeamDesc} onChange={(e) => setEditTeamDesc(e.target.value)} placeholder="请输入班组描述" />
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setShowEditTeamDialog(false)} className="flex-1">取消</Button>
                        <Button onClick={updateTeam} className="flex-1">保存</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                
                <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={openHistoryDialog}>
                  <History className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">历史记录</span>
                  <span className="sm:hidden">历史</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 晨会要求提示 - 选择班组后显示 */}
        {selectedTeamId && (
          <div className="max-w-2xl mx-auto">
            <MeetingGuidelines />
          </div>
        )}

        {!selectedTeamId ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="p-6 sm:p-8 text-center">
              <Users className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">请先选择班组</h3>
              <p className="text-gray-600 text-sm sm:text-base">选择班组后开始今日晨会</p>
            </CardContent>
          </Card>
        ) : !meeting || meeting.status === 'completed' ? (
          <div className="max-w-2xl mx-auto space-y-3 sm:space-y-4">
            {/* 如果有已结束的会议，显示提示 */}
            {meeting?.status === 'completed' && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">今日会议已完成</span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">可以重新发起一场新会议</p>
                </CardContent>
              </Card>
            )}
            {/* 班组成员管理 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  班组成员
                </CardTitle>
                <CardDescription>
                  管理班组成员，添加后可在发起会议时自动加入参会列表
                </CardDescription>
              </CardHeader>
              <CardContent>
                {teamMembers.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    暂无成员，请添加班组成员
                  </div>
                ) : (
                  <div className="space-y-2 mb-4">
                    {teamMembers.map(member => (
                      <div key={member.id} className="flex items-center justify-between p-3 rounded border bg-white">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{member.name}</span>
                            {member.is_leader && <Badge variant="secondary" className="text-xs">班组长</Badge>}
                          </div>
                          <div className="text-xs text-gray-500">
                            {member.location && <span className="mr-2">📍 {member.location}</span>}
                            {member.position && <span>💼 {member.position}</span>}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEditMemberDialog(member)} title="编辑">
                            ✏️
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:text-red-700" onClick={() => deleteTeamMember(member.id, member.name)} title="删除">
                            🗑️
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* 添加成员按钮 */}
                <Dialog open={showMemberDialog} onOpenChange={setShowMemberDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Plus className="h-4 w-4 mr-1" />
                      添加班组成员
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>添加班组成员</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div>
                        <Label>姓名 *</Label>
                        <Input value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} placeholder="请输入姓名" />
                      </div>
                      <div>
                        <Label>办公地点</Label>
                        <Input value={newMemberLocation} onChange={(e) => setNewMemberLocation(e.target.value)} placeholder="请输入办公地点" />
                      </div>
                      <div>
                        <Label>职位</Label>
                        <Input value={newMemberPosition} onChange={(e) => setNewMemberPosition(e.target.value)} placeholder="请输入职位" />
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="isLeader" checked={newMemberIsLeader} onChange={(e) => setNewMemberIsLeader(e.target.checked)} />
                        <Label htmlFor="isLeader">是否为班组长</Label>
                      </div>
                      <Button onClick={addTeamMember} className="w-full">添加成员</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
            
            {/* 发起会议 */}
            <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500" />
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-8 w-8 text-blue-500" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">准备就绪</h3>
                <p className="text-slate-500 mb-6">
                  {teamMembers.length > 0 
                    ? `班组共 ${teamMembers.length} 人，请选择今日参会人员`
                    : '点击下方按钮发起今日晨会'
                  }
                </p>
                <Button 
                  onClick={openMemberSelectDialog} 
                  size="lg" 
                  className="w-full max-w-xs bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-500/25 text-base font-medium" 
                  disabled={teamMembers.length === 0}
                >
                  <Plus className="mr-2 h-5 w-5" />
                  发起晨会
                </Button>
                {teamMembers.length === 0 && (
                  <p className="text-orange-500 text-sm mt-2">请先添加班组成员</p>
                )}
              </CardContent>
            </Card>

            {/* 人员选择弹窗 */}
            <Dialog open={showMemberSelectDialog} onOpenChange={setShowMemberSelectDialog}>
              <DialogContent className="max-w-md" style={{ maxHeight: '80vh', height: 'auto' }}>
                <DialogHeader className="shrink-0">
                  <DialogTitle>选择今日参会人员</DialogTitle>
                  <DialogDescription>
                    请勾选今日参加晨会的人员，共 {teamMembers.length} 人班组
                  </DialogDescription>
                </DialogHeader>
                <div className="flex items-center justify-between py-2 border-b shrink-0">
                  <span className="text-sm text-slate-600">
                    已选择 {selectedMemberIds.length} 人
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={toggleSelectAllMembers}
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    {selectedMemberIds.length === teamMembers.length ? '取消全选' : '全选'}
                  </Button>
                </div>
                <ScrollArea className="h-[300px] shrink-0">
                  <div className="space-y-2 p-1">
                    {teamMembers.map((member) => (
                      <label 
                        key={member.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedMemberIds.includes(member.id)
                            ? 'border-blue-300 bg-blue-50'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedMemberIds.includes(member.id)}
                          onChange={() => toggleMemberSelection(member.id)}
                          className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-slate-800">{member.name}</div>
                          <div className="text-xs text-slate-500">
                            {member.position || '班组成员'}
                            {member.is_leader && (
                              <Badge variant="outline" className="ml-2 text-xs bg-amber-50 text-amber-700 border-amber-200">
                                班组长
                              </Badge>
                            )}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
                <div className="flex justify-end gap-2 pt-4 border-t shrink-0">
                  <Button variant="outline" onClick={() => setShowMemberSelectDialog(false)}>
                    取消
                  </Button>
                  <Button 
                    onClick={confirmStartMeeting}
                    disabled={selectedMemberIds.length === 0}
                    className="bg-gradient-to-r from-blue-500 to-indigo-600"
                  >
                    确认发起会议 ({selectedMemberIds.length}人)
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            {/* 语音对讲 - 发起会议前也可使用 */}
            {selectedTeamId && teamMembers.length > 0 && (
              <VoiceChatPanel
                roomId={`team-${selectedTeamId}`}
                teamName={teams.find(t => t.id === selectedTeamId)?.name}
              />
            )}
          </div>
        ) : (
          <>
            {/* 出勤统计 - 高端数据卡片 */}
            <div className="max-w-4xl mx-auto">
              <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500" />
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                        meeting.status === 'ongoing' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        <span className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${meeting.status === 'ongoing' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                          {meeting.status === 'ongoing' ? '会议进行中' : '会议已结束'}
                        </span>
                      </div>
                      <span className="text-slate-700 font-medium">{meeting.teams?.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium">
                          <Users className="h-3.5 w-3.5" />
                          共{stats.total}人
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          已签到{stats.present}
                        </div>
                        {stats.leave > 0 && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
                            请假{stats.leave}
                          </div>
                        )}
                        {stats.absent > 0 && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                            缺勤{stats.absent}
                          </div>
                        )}
                        {stats.pending > 0 && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium">
                            待签到{stats.pending}
                          </div>
                        )}
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={async () => {
                          await loadParticipants(meeting.id);
                          await loadMeetingRecord(meeting.id);
                        }}
                        className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                        title="刷新数据"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </Button>
                    </div>
                  </div>
                  
                  {/* 出勤进度条 */}
                  {stats.total > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                        <span>签到进度</span>
                        <span>{Math.round((stats.present / stats.total) * 100)}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
                        {stats.present > 0 && (
                          <div 
                            className="bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
                            style={{ width: `${(stats.present / stats.total) * 100}%` }}
                          />
                        )}
                        {stats.leave > 0 && (
                          <div 
                            className="bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
                            style={{ width: `${(stats.leave / stats.total) * 100}%` }}
                          />
                        )}
                        {stats.absent > 0 && (
                          <div 
                            className="bg-gradient-to-r from-red-400 to-red-500 transition-all duration-500"
                            style={{ width: `${(stats.absent / stats.total) * 100}%` }}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* 语音对讲面板 - 选中班组后即可使用 */}
            {selectedTeamId && (
              <div className="max-w-4xl mx-auto">
                <VoiceChatPanel
                  roomId={`team-${selectedTeamId}`}
                  teamName={teams.find(t => t.id === selectedTeamId)?.name}
                />
              </div>
            )}

            {/* 视图切换 */}
            <Tabs value={currentView} onValueChange={(v) => setCurrentView(v as 'signin' | 'manage')} className="max-w-4xl mx-auto">
              <TabsList className="grid w-full grid-cols-2 h-11 bg-slate-100/80 backdrop-blur-sm">
                <TabsTrigger value="signin" className="text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <PenTool className="h-4 w-4 mr-1.5" />
                  参会人员签到
                </TabsTrigger>
                <TabsTrigger value="manage" className="text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Settings className="h-4 w-4 mr-1.5" />
                  工班长管理
                </TabsTrigger>
              </TabsList>

              {/* 参会人员签到视图 */}
              <TabsContent value="signin" className="space-y-4 mt-4">
                <Card className="shadow-md border-slate-200/60 bg-white/90 backdrop-blur-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
                      <div className="p-1.5 rounded-lg bg-blue-50">
                        <PenTool className="h-5 w-5 text-blue-600" />
                      </div>
                      请选择您的名字进行签到
                    </CardTitle>
                    <CardDescription className="text-sm text-slate-500">
                      点击姓名卡片，完成签名确认出勤
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {pendingParticipants.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                        </div>
                        <p className="text-emerald-600 font-medium">所有人员已完成签到</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {pendingParticipants.map((p) => (
                          <button
                            key={p.id}
                            className="group relative p-4 rounded-xl border-2 border-slate-200 hover:border-blue-400 bg-white hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 hover:shadow-lg hover:shadow-blue-100"
                            onClick={() => signInParticipant(p)}
                          >
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center group-hover:from-blue-100 group-hover:to-indigo-100 transition-colors">
                                <span className="text-lg font-medium text-slate-600 group-hover:text-blue-600">{p.name[0]}</span>
                              </div>
                              <span className="font-medium text-slate-700 group-hover:text-blue-700">{p.name}</span>
                              {p.location && <span className="text-xs text-slate-400">{p.location}</span>}
                            </div>
                            <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-blue-300 pointer-events-none" />
                          </button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 已签到人员 */}
                {completedParticipants.length > 0 && (
                  <Card className="shadow-md border-slate-200/60 bg-white/90 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-slate-700">已完成签到</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {completedParticipants.map((p) => (
                          <div 
                            key={p.id} 
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                              p.attendance_status === 'present' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : p.attendance_status === 'leave'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                          >
                            <span>{p.name}</span>
                            {p.attendance_status === 'present' && <CheckCircle2 className="h-3.5 w-3.5" />}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* 工班长管理视图 */}
              <TabsContent value="manage" className="space-y-4 mt-4">
                {/* 晨会必读内容查看 */}
                <TrainingContentViewer departmentId={currentDepartment.id} />
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* 左侧：人员管理 */}
                  <div className="space-y-4">
                    {/* 班组成员管理 */}
                    <Card className="shadow-md border-slate-200/60 bg-white/90 backdrop-blur-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                          <div className="p-1.5 rounded-lg bg-indigo-50">
                            <Users className="h-4 w-4 text-indigo-600" />
                          </div>
                          班组成员管理
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-48">
                          {teamMembers.length === 0 ? (
                            <div className="text-center py-6 text-slate-400 text-sm">暂无成员</div>
                          ) : (
                            <div className="space-y-2">
                              {teamMembers.map(member => (
                                <div key={member.id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-sm transition-all">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-slate-700 truncate">{member.name}</span>
                                      {member.is_leader && (
                                        <span className="px-1.5 py-0.5 text-xs font-medium bg-indigo-50 text-indigo-600 rounded">班组长</span>
                                      )}
                                    </div>
                                    {member.location && <div className="text-xs text-slate-400 mt-0.5">📍 {member.location}</div>}
                                  </div>
                                  <div className="flex gap-1 shrink-0">
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-blue-50 hover:text-blue-600" onClick={() => openEditMemberDialog(member)} title="编辑">
                                      ✏️
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600" onClick={() => deleteTeamMember(member.id, member.name)} title="删除">
                                      🗑️
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </ScrollArea>
                        
                        {/* 添加成员按钮 */}
                        <Dialog open={showMemberDialog} onOpenChange={setShowMemberDialog}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full mt-2">
                              <Plus className="h-3 w-3 mr-1" />
                              添加成员
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>添加班组成员</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                              <div>
                                <Label>姓名 *</Label>
                                <Input value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} placeholder="请输入姓名" />
                              </div>
                              <div>
                                <Label>办公地点</Label>
                                <Input value={newMemberLocation} onChange={(e) => setNewMemberLocation(e.target.value)} placeholder="请输入办公地点" />
                              </div>
                              <div>
                                <Label>职位</Label>
                                <Input value={newMemberPosition} onChange={(e) => setNewMemberPosition(e.target.value)} placeholder="请输入职位" />
                              </div>
                              <div className="flex items-center gap-2">
                                <input type="checkbox" id="isLeader2" checked={newMemberIsLeader} onChange={(e) => setNewMemberIsLeader(e.target.checked)} />
                                <Label htmlFor="isLeader2">是否为班组长</Label>
                              </div>
                              <Button onClick={addTeamMember} className="w-full">添加成员</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </CardContent>
                    </Card>

                    {/* 出勤管理 */}
                    <Card className="shadow-md border-slate-200/60 bg-white/90 backdrop-blur-sm">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                            <div className="p-1.5 rounded-lg bg-emerald-50">
                              <UserCheck className="h-4 w-4 text-emerald-600" />
                            </div>
                            出勤管理
                          </CardTitle>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => meeting && loadParticipants(meeting.id)}
                            disabled={!meeting}
                            className="text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-48">
                          <div className="space-y-2">
                            {participants.map((p) => (
                              <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-sm transition-all">
                                <div className="flex-1">
                                  <div className="font-medium text-slate-700">{p.name}</div>
                                  {p.leave_reason && (
                                    <div className="text-xs text-amber-600 mt-0.5">原因：{p.leave_reason}</div>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                    p.attendance_status === 'present' 
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                      : p.attendance_status === 'leave'
                                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                      : p.attendance_status === 'absent'
                                      ? 'bg-red-50 text-red-700 border border-red-200'
                                      : 'bg-slate-50 text-slate-600 border border-slate-200'
                                  }`}>
                                    {ATTENDANCE_STATUS[p.attendance_status as keyof typeof ATTENDANCE_STATUS]?.label}
                                  </span>
                                  {p.attendance_status === 'pending' && (
                                    <div className="flex gap-1 ml-2">
                                      <Button size="sm" variant="ghost" className="text-orange-600 h-7 w-7 p-0" onClick={() => openLeaveDialog(p.id)} title="请假">
                                        <UserMinus className="h-4 w-4" />
                                      </Button>
                                      <Button size="sm" variant="ghost" className="text-red-600 h-7 w-7 p-0" onClick={() => markAttendance(p.id, 'absent')} title="缺勤">
                                        <UserX className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  )}
                                  {p.attendance_status !== 'pending' && p.attendance_status !== 'present' && (
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 ml-1" onClick={() => markAttendance(p.id, 'pending')} title="重置">
                                      <Clock className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </div>

                  {/* 中间：录音 */}
                  <div className="space-y-4">
                    <Card className="shadow-md border-slate-200/60 bg-white/90 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-slate-800">
                          <div className="p-1.5 rounded-lg bg-red-50">
                            <Mic className="h-5 w-5 text-red-500" />
                          </div>
                          会议录音
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {/* 录音功能已移至页面底部悬浮按钮 */}
                        {recordingBlobGlobal && (
                          <div className="text-center text-green-600 py-2">
                            <p className="font-medium">录音已完成</p>
                            <p className="text-sm text-gray-500">时长：{formatTime(recordingTimeGlobal)}</p>
                          </div>
                        )}
                        {processingAI && (
                          <div className="mt-4 flex items-center justify-center gap-2 text-blue-600 bg-blue-50 py-3 rounded-lg">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span className="font-medium">AI识别中...</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="shadow-md border-slate-200/60 bg-white/90 backdrop-blur-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base text-slate-700">识别文本</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="语音识别文本将显示在此处..." className="h-32 resize-none border-slate-200 focus:border-blue-300" />
                      </CardContent>
                    </Card>
                  </div>

                  {/* 右侧：总结和保存 */}
                  <div className="space-y-4">
                    <Card className="h-full flex flex-col shadow-md border-slate-200/60 bg-white/90 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-slate-800">
                          <div className="p-1.5 rounded-lg bg-emerald-50">
                            <FileText className="h-5 w-5 text-emerald-600" />
                          </div>
                          会议总结
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col">
                        <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="AI总结内容将显示在此处..." className="flex-1 min-h-[200px] resize-none font-mono text-sm border-slate-200 focus:border-blue-300" />
                        <div className="flex gap-2 mt-4">
                          <Button onClick={saveMeetingRecord} className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-md" disabled={!transcript && !summary}>
                            <Save className="mr-2 h-4 w-4" />
                            保存记录
                          </Button>
                          <Button onClick={endMeeting} variant="destructive" disabled={meeting.status === 'completed'} className="shadow-md">
                            结束会议
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

        {/* 悬浮录音控件 - 录音时始终可见 */}
        {isRecordingGlobal && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white shadow-2xl rounded-2xl px-8 py-4 flex items-center gap-6 border-2 border-red-200 animate-in slide-in-from-bottom-4">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-600 font-bold text-lg">{formatTime(recordingTimeGlobal)}</span>
            </div>
            <button
              onClick={stopGlobalRecording}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors font-medium"
            >
              <div className="w-3 h-3 bg-red-500 rounded-sm" />
              停止录音
            </button>
          </div>
        )}

        {/* 录音按钮 - 非录音状态时显示 */}
        {!isRecordingGlobal && meeting && meeting.status === 'ongoing' && (
          <div className="fixed bottom-6 right-6 z-40">
            <button
              onClick={startGlobalRecording}
              className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all hover:scale-105"
            >
              <Mic className="w-5 h-5" />
              <span className="font-medium">开始录音</span>
            </button>
          </div>
        )}
          </>
        )}
      </div>

      {/* 签名弹窗 */}
      <Dialog open={!!signingParticipant} onOpenChange={() => setSigningParticipant(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{signingParticipant?.name} - 请签名确认出勤</DialogTitle>
          </DialogHeader>
          {signingParticipant && (
            <SignaturePad participantName={signingParticipant.name} onSignatureReady={handleSignature} />
          )}
        </DialogContent>
      </Dialog>

      {/* 请假原因弹窗 */}
      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>请假原因</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Textarea value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} placeholder="请输入请假原因..." className="resize-none" />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowLeaveDialog(false)} className="flex-1">取消</Button>
              <Button onClick={confirmLeave} className="flex-1">确认请假</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 历史记录弹窗 */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] w-[95vw] sm:w-full">
          <DialogHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <DialogTitle className="text-base sm:text-lg">历史会议记录</DialogTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={(e) => { e.stopPropagation(); exportToExcel(); }}
                disabled={historyMeetings.length === 0}
              >
                <FileSpreadsheet className="h-4 w-4 mr-1" />
                导出Excel
              </Button>
            </div>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 pt-3 sm:pt-4 overflow-auto max-h-[60vh]">
            {loadingHistory ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : historyMeetings.length === 0 ? (
              <p className="text-center text-gray-500 py-8">暂无历史记录</p>
            ) : (
              <div className="space-y-2">
                {historyMeetings.map(m => (
                  <Card key={m.id} className="hover:bg-gray-50 active:bg-gray-100">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-center justify-between">
                        <div 
                          className="flex-1 cursor-pointer" 
                          onClick={() => viewHistoryMeetingDetail(m)}
                        >
                          <div className="font-medium text-sm sm:text-base">{m.date} {m.teams?.name || ''}</div>
                          <div className="text-xs sm:text-sm text-gray-500">状态：{m.status === 'completed' ? '已结束' : '进行中'}</div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs sm:text-sm"
                            onClick={() => viewHistoryMeetingDetail(m)}
                          >
                            查看
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-xs sm:text-sm text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteMeeting(m.id, m.date);
                            }}
                          >
                            删除
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 历史会议详情弹窗 */}
      <Dialog open={!!selectedHistoryMeeting} onOpenChange={() => setSelectedHistoryMeeting(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] w-[95vw] sm:w-full">
          <DialogHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <DialogTitle className="text-base sm:text-lg">{selectedHistoryMeeting?.date} 会议详情</DialogTitle>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => selectedHistoryMeeting && exportMeetingDetailToExcel(selectedHistoryMeeting)}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  导出
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => {
                    if (selectedHistoryMeeting) {
                      setSelectedHistoryMeeting(null);
                      deleteMeeting(selectedHistoryMeeting.id, selectedHistoryMeeting.date);
                    }
                  }}
                >
                  删除会议
                </Button>
              </div>
            </div>
          </DialogHeader>
          {selectedHistoryMeeting && (
            <div className="space-y-3 sm:space-y-4 overflow-auto max-h-[60vh]">
              {/* 参会人员签到详情 */}
              <div>
                <h4 className="font-medium mb-2 text-sm sm:text-base">参会人员签到详情</h4>
                <div className="space-y-2">
                  {selectedHistoryMeeting.participants?.map(p => (
                    <Card key={p.id} className="overflow-hidden">
                      <CardContent className="p-2 sm:p-3">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                          {/* 状态信息 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm sm:text-base">{p.name}</span>
                              <Badge variant={ATTENDANCE_STATUS[p.attendance_status as keyof typeof ATTENDANCE_STATUS]?.color as any} className="text-xs">
                                {ATTENDANCE_STATUS[p.attendance_status as keyof typeof ATTENDANCE_STATUS]?.label}
                              </Badge>
                            </div>
                            {p.location && <div className="text-xs text-gray-500">📍 {p.location}</div>}
                            {p.leave_reason && <div className="text-xs text-orange-600 mt-1">请假原因：{p.leave_reason}</div>}
                            {p.signed_at && (
                              <div className="text-xs text-gray-500 mt-1">
                                签字时间：{new Date(p.signed_at).toLocaleString('zh-CN')}
                              </div>
                            )}
                          </div>
                          
                          {/* 签名图片 */}
                          {p.signature_url && (
                            <div className="shrink-0 self-end sm:self-auto">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-gray-500">签名：</span>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-5 px-1 text-xs"
                                  onClick={() => downloadSignature(p.signature_url!, p.name)}
                                >
                                  <Download className="h-3 w-3 mr-1" />
                                  下载
                                </Button>
                              </div>
                              <img 
                                src={p.signature_url} 
                                alt={`${p.name}的签名`}
                                className="w-24 h-16 sm:w-32 sm:h-20 object-contain border rounded bg-white"
                              />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
              
              {/* 录音回放 */}
              {selectedHistoryMeeting.meeting_records?.[0]?.audio_url && (
                <div>
                  <h4 className="font-medium mb-2">会议录音</h4>
                  <Card><CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <audio 
                        controls 
                        src={selectedHistoryMeeting.meeting_records[0].audio_url}
                        className="flex-1"
                      >
                        您的浏览器不支持音频播放
                      </audio>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => downloadAudio(
                          selectedHistoryMeeting.meeting_records![0].audio_url!,
                          selectedHistoryMeeting.date
                        )}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        下载录音
                      </Button>
                    </div>
                  </CardContent></Card>
                </div>
              )}
              
              {selectedHistoryMeeting.meeting_records?.[0]?.summary && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">会议总结</h4>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-blue-500 hover:text-blue-700"
                      onClick={() => openEditRecordDialog(selectedHistoryMeeting.meeting_records![0])}
                    >
                      编辑
                    </Button>
                  </div>
                  <Card><CardContent className="p-4">
                    <pre className="whitespace-pre-wrap text-sm font-mono">
                      {typeof selectedHistoryMeeting.meeting_records[0].summary === 'string'
                        ? selectedHistoryMeeting.meeting_records[0].summary
                        : JSON.stringify(selectedHistoryMeeting.meeting_records[0].summary, null, 2)}
                    </pre>
                  </CardContent></Card>
                </div>
              )}
              {selectedHistoryMeeting.meeting_records?.[0]?.transcript && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">语音识别文本</h4>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-blue-500 hover:text-blue-700"
                      onClick={() => openEditRecordDialog(selectedHistoryMeeting.meeting_records![0])}
                    >
                      编辑
                    </Button>
                  </div>
                  <Card><CardContent className="p-4">
                    <p className="text-sm">{selectedHistoryMeeting.meeting_records[0].transcript}</p>
                  </CardContent></Card>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 编辑成员弹窗 */}
      <Dialog open={showEditMemberDialog} onOpenChange={setShowEditMemberDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑班组成员</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>姓名 *</Label>
              <Input value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} placeholder="请输入姓名" />
            </div>
            <div>
              <Label>办公地点</Label>
              <Input value={newMemberLocation} onChange={(e) => setNewMemberLocation(e.target.value)} placeholder="请输入办公地点" />
            </div>
            <div>
              <Label>职位</Label>
              <Input value={newMemberPosition} onChange={(e) => setNewMemberPosition(e.target.value)} placeholder="请输入职位" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="editIsLeader" checked={newMemberIsLeader} onChange={(e) => setNewMemberIsLeader(e.target.checked)} />
              <Label htmlFor="editIsLeader">是否为班组长</Label>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowEditMemberDialog(false)} className="flex-1">取消</Button>
              <Button onClick={updateTeamMember} className="flex-1">保存</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 编辑会议记录弹窗 */}
      <Dialog open={showEditRecordDialog} onOpenChange={setShowEditRecordDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>编辑会议记录</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4 overflow-auto max-h-[60vh]">
            <div>
              <Label className="text-sm font-medium">语音识别文本</Label>
              <Textarea 
                value={editTranscript} 
                onChange={(e) => setEditTranscript(e.target.value)} 
                placeholder="语音识别文本..."
                className="mt-1 min-h-[120px] resize-none"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">会议总结</Label>
              <Textarea 
                value={editSummary} 
                onChange={(e) => setEditSummary(e.target.value)} 
                placeholder="会议总结..."
                className="mt-1 min-h-[200px] resize-none font-mono text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowEditRecordDialog(false)} className="flex-1">取消</Button>
              <Button onClick={saveEditRecord} className="flex-1">保存</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
