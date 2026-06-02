'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStore, Expense } from '@/lib/store';
import { isMockMode } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Plus, Trash2, Search, Filter, Calendar, DollarSign, Sparkles, Loader2, AlertCircle, ArrowRight,
  Home, Utensils, Car, Film, Zap, Bed, Handshake, UserPlus, LogOut, Pencil, ShoppingBag, Upload, X, Settings,
  ZoomIn, ZoomOut, RotateCcw, Camera, Video, RefreshCw, ChevronDown, QrCode, ReceiptText
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ExpenseForm from '@/components/expenses/expense-form';
import DebtVisualizer from '@/components/settle/debt-visualizer';
import Link from 'next/link';
import { parseNaturalLanguageWithAI, scanReceiptWithAI } from '@/lib/ai';
import dynamic from 'next/dynamic';

const SpendingChart = dynamic(() => import('@/components/dashboard/spending-chart'), { ssr: false });

const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case 'food':
      return <Utensils className="h-5 w-5" />;
    case 'housing':
      return <Home className="h-5 w-5" />;
    case 'transport':
      return <Car className="h-5 w-5" />;
    case 'entertainment':
      return <Film className="h-5 w-5" />;
    case 'utilities':
      return <Zap className="h-5 w-5" />;
    case 'lodging':
    case 'accommodation':
      return <Bed className="h-5 w-5" />;
    case 'shopping':
      return <ShoppingBag className="h-5 w-5" />;
    case 'settlement':
      return <Handshake className="h-5 w-5" />;
    case 'general':
    case 'others':
    default:
      return <DollarSign className="h-5 w-5" />;
  }
};

export default function GroupDetail() {
  const params = useParams();
  const router = useRouter();
  const groupId = params?.id as string;

  const { currentUser, groups, expenses, profiles, settlements, confirmSettlement, declineSettlement, deleteExpense, addExpense, updateExpense, leaveGroup, deleteGroup, inviteMemberToGroup, updateGroup, removeMemberFromGroup, updateProfile, isLoading } = useStore();
  
  // Dialog Open States
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Group settings states
  const [groupSettingsOpen, setGroupSettingsOpen] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDescription, setEditGroupDescription] = useState('');
  const [isSavingGroupSettings, setIsSavingGroupSettings] = useState(false);
  const [groupSettingsError, setGroupSettingsError] = useState<string | null>(null);
  const [groupSettingsSuccess, setGroupSettingsSuccess] = useState<string | null>(null);

  // Invite states
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Reusable confirmation states
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // NLP parsing states
  const [nlpText, setNlpText] = useState('');
  const [isParsingNLP, setIsParsingNLP] = useState(false);
  const [nlpError, setNlpError] = useState<string | null>(null);
  const [nlpSuccess, setNlpSuccess] = useState<string | null>(null);
  const [nlpInitialData, setNlpInitialData] = useState<any | null>(null);

  // Receipt Scanning & Splitting states
  const [isScanningReceipt, setIsScanningReceipt] = useState(false);
  const [scannedReceiptData, setScannedReceiptData] = useState<{
    title: string;
    amount: number;
    category: string;
    date: string;
    items: { name: string; amount: number }[];
  } | null>(null);
  const [receiptSplitterOpen, setReceiptSplitterOpen] = useState(false);
  const [receiptPayerId, setReceiptPayerId] = useState('');
  const [receiptItemAssignments, setReceiptItemAssignments] = useState<Record<number, string[]>>({});
  const [receiptItemCustomAmounts, setReceiptItemCustomAmounts] = useState<Record<number, Record<string, string>>>({});
  const [receiptTaxPercent, setReceiptTaxPercent] = useState('0');
  const [receiptChargePercent, setReceiptChargePercent] = useState('0');

  // Drawer & Lightbox states
  const [selectedDetailExpense, setSelectedDetailExpense] = useState<Expense | null>(null);
  const [isImageLightboxOpen, setIsImageLightboxOpen] = useState(false);
  const [scannedReceiptBase64, setScannedReceiptBase64] = useState<string | null>(null);
  const [permissionWarningOpen, setPermissionWarningOpen] = useState(false);
  const [permissionWarningMessage, setPermissionWarningMessage] = useState('');

  // Zoom & Rotate states for receipt splitter side-by-side view
  const [splitterZoom, setSplitterZoom] = useState(1);
  const [splitterRotate, setSplitterRotate] = useState(0);

  // Zoom & Pan states for receipt lightbox
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Camera Scanner states
  const [companionDialogOpen, setCompanionDialogOpen] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [scanMenuOpen, setScanMenuOpen] = useState(false);
  const [scanMenuRect, setScanMenuRect] = useState<{ top: number; left: number } | null>(null);
  const scanBtnRef = useRef<HTMLButtonElement | null>(null);

  // Webcam Scanner states
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [webcamCapturedImage, setWebcamCapturedImage] = useState<string | null>(null);
  const [webcamScanError, setWebcamScanError] = useState<string | null>(null);
  const [isSubmittingWebcam, setIsSubmittingWebcam] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // QR Code upload states
  const [isUploadingQr, setIsUploadingQr] = useState(false);
  const [qrUploadError, setQrUploadError] = useState<string | null>(null);
  const [qrUploadSuccess, setQrUploadSuccess] = useState<string | null>(null);
  const [qrCodeLabel, setQrCodeLabel] = useState('DuitNow');
  const [isSavingLabel, setIsSavingLabel] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownIntervalRef = useRef<any>(null);

  // Zoom Qr Dialog states
  const [zoomedQrUrl, setZoomedQrUrl] = useState<string | null>(null);
  const [zoomedQrLabel, setZoomedQrLabel] = useState<string | null>(null);
  const [zoomedQrName, setZoomedQrName] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser?.qr_code_label) {
      setQrCodeLabel(currentUser.qr_code_label);
    }
  }, [currentUser?.qr_code_label]);

  useEffect(() => {
    if (!isImageLightboxOpen) {
      setZoomScale(1);
      setPanOffset({ x: 0, y: 0 });
    }
  }, [isImageLightboxOpen]);

  useEffect(() => {
    if (!receiptSplitterOpen) {
      setSplitterZoom(1);
      setSplitterRotate(0);
    }
  }, [receiptSplitterOpen]);

  const group = groups.find((g) => g.id === groupId);

  useEffect(() => {
    if (group && groupSettingsOpen) {
      setEditGroupName(group.name);
      setEditGroupDescription(group.description || '');
      setGroupSettingsError(null);
      setGroupSettingsSuccess(null);
    }
  }, [group, groupSettingsOpen]);

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    setInviteError(null);
    setInviteSuccess(null);

    try {
      await inviteMemberToGroup(groupId, inviteEmail.trim());
      setInviteSuccess(`Successfully added ${inviteEmail} to the group!`);
      setInviteEmail('');
      setTimeout(() => {
        setInviteSuccess(null);
        setInviteOpen(false);
      }, 2000);
    } catch (err: any) {
      // console.error(err);
      setInviteError(err.message || 'Failed to invite user. Make sure they are registered.');
    } finally {
      setIsInviting(false);
    }
  };

  const compressQrImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const max_size = 250;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > max_size) {
              height *= max_size / width;
              width = max_size;
            }
          } else {
            if (height > max_size) {
              width *= max_size / height;
              height = max_size;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas 2d context'));
            return;
          }
          // Fill canvas with white background (handles transparent PNGs correctly)
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = () => {
          reject(new Error('Failed to load image for compression'));
        };
        img.src = event.target?.result as string;
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleQrCodeFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingQr(true);
    setQrUploadError(null);
    setQrUploadSuccess(null);

    try {
      const base64 = await compressQrImage(file);
      await updateProfile({
        display_name: currentUser?.display_name || '',
        avatar_url: currentUser?.avatar_url || '',
        phone: currentUser?.phone,
        duitnow_type: currentUser?.duitnow_type,
        duitnow_id: currentUser?.duitnow_id,
        tng_phone: currentUser?.tng_phone,
        mae_account: currentUser?.mae_account,
        paypal_email: currentUser?.paypal_email,
        venmo_handle: currentUser?.venmo_handle,
        default_currency: currentUser?.default_currency || 'RM',
        qr_code_url: base64,
        qr_code_label: qrCodeLabel || 'DuitNow'
      });
      setQrUploadSuccess('QR code uploaded successfully!');
    } catch (err: any) {
      // console.error(err);
      setQrUploadError(err.message || 'Failed to upload QR Code');
    } finally {
      setIsUploadingQr(false);
    }
  };

  const handleRemoveQrCode = async () => {
    setQrUploadError(null);
    setQrUploadSuccess(null);
    try {
      await updateProfile({
        display_name: currentUser?.display_name || '',
        avatar_url: currentUser?.avatar_url || '',
        phone: currentUser?.phone,
        duitnow_type: currentUser?.duitnow_type,
        duitnow_id: currentUser?.duitnow_id,
        tng_phone: currentUser?.tng_phone,
        mae_account: currentUser?.mae_account,
        paypal_email: currentUser?.paypal_email,
        venmo_handle: currentUser?.venmo_handle,
        default_currency: currentUser?.default_currency || 'RM',
        qr_code_url: '',
        qr_code_label: qrCodeLabel || 'DuitNow'
      });
      setQrUploadSuccess('QR code removed successfully!');
    } catch (err: any) {
      setQrUploadError('Failed to remove QR Code');
    }
  };

  const handleSaveQrLabel = async () => {
    if (!currentUser) return;
    setIsSavingLabel(true);
    try {
      await updateProfile({
        display_name: currentUser.display_name || '',
        avatar_url: currentUser.avatar_url || '',
        phone: currentUser.phone,
        duitnow_type: currentUser.duitnow_type,
        duitnow_id: currentUser.duitnow_id,
        tng_phone: currentUser.tng_phone,
        mae_account: currentUser.mae_account,
        paypal_email: currentUser.paypal_email,
        venmo_handle: currentUser.venmo_handle,
        default_currency: currentUser.default_currency || 'RM',
        qr_code_url: currentUser.qr_code_url,
        qr_code_label: qrCodeLabel.trim() || 'DuitNow'
      });
    } catch (err) {
      // console.error('Failed to save QR label:', err);
    } finally {
      setIsSavingLabel(false);
    }
  };

  const handleKeyDownQrLabel = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const handleLeaveGroupClick = () => {
    setLeaveConfirmOpen(true);
  };

  const handleDeleteGroupClick = () => {
    setDeleteConfirmOpen(true);
  };

  const executeLeaveGroup = async () => {
    setIsExecutingAction(true);
    setActionError(null);
    try {
      await leaveGroup(groupId);
      setLeaveConfirmOpen(false);
      router.push('/groups');
    } catch (err: any) {
      setActionError(err.message || 'Failed to leave the group. Please try again.');
    } finally {
      setIsExecutingAction(false);
    }
  };

  const executeDeleteGroup = async () => {
    setIsExecutingAction(true);
    setActionError(null);
    try {
      await deleteGroup(groupId);
      setDeleteConfirmOpen(false);
      router.push('/groups');
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete the group. Please try again.');
    } finally {
      setIsExecutingAction(false);
    }
  };

  const executeDeleteExpense = async () => {
    if (!expenseToDelete) return;
    setIsExecutingAction(true);
    setActionError(null);
    try {
      await deleteExpense(expenseToDelete);
      setExpenseToDelete(null);
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete the expense. Please try again.');
    } finally {
      setIsExecutingAction(false);
    }
  };

  const handleEditExpenseClick = (exp: Expense) => {
    setNlpInitialData({
      id: exp.id,
      description: exp.description,
      amount: exp.amount,
      paid_by_id: exp.paid_by_id,
      category: exp.category,
      date: exp.date,
      splits: exp.splits,
      splitType: exp.splitType || 'equal',
      receiptUrl: exp.receipt_url,
      items: exp.items
    });
    setExpenseFormOpen(true);
  };

  const handleNLPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nlpText.trim()) return;

    setIsParsingNLP(true);
    setNlpError(null);
    setNlpSuccess(null);
    try {
      const response = await parseNaturalLanguageWithAI(nlpText, memberProfiles, currentUser?.id || '');
      if (response.success) {
        if (!response.amount || response.amount <= 0) {
          throw new Error('AI could not parse a valid amount.');
        }
        if (!response.splits || response.splits.length === 0) {
          throw new Error('AI could not determine how to split the expense.');
        }

        const id = await addExpense(
          groupId,
          response.description || 'Quick AI Expense',
          response.amount,
          response.date,
          response.paid_by_id,
          response.category,
          response.splits
        );

        if (id) {
          setNlpSuccess(`Expense "${response.description}" (RM ${response.amount.toFixed(2)}) logged successfully!`);
          setNlpText('');
          // Clear success message after 5 seconds
          setTimeout(() => {
            setNlpSuccess(null);
          }, 5000);
        } else {
          setNlpError('Failed to save the parsed expense.');
        }
      } else {
        setNlpError(response.message || 'Failed to parse text. Please try again.');
      }
    } catch (err: any) {
      // console.error(err);
      setNlpError(err.message || 'An error occurred while parsing text.');
    } finally {
      setIsParsingNLP(false);
    }
  };

  const processBase64Receipt = async (base64Image: string, fileName: string = 'receipt.jpg') => {
    if (!group) return;

    setIsScanningReceipt(true);
    setNlpError(null);
    setNlpSuccess(null);

    try {
      const response = await scanReceiptWithAI(base64Image, fileName);
      // console.log('[Receipt Scan] API Response (debug):', response.success ? 'OK' : 'Failed');
      
      if (response.success) {
        setScannedReceiptBase64(base64Image);
        const items = response.items && response.items.length > 0 
          ? response.items 
          : [{ name: response.description || 'Total Receipt Charge', amount: response.amount }];
        
        setScannedReceiptData({
          title: response.description || 'Scanned Receipt',
          amount: response.amount || items.reduce((sum, item) => sum + item.amount, 0),
          category: response.category || 'others',
          date: response.date || new Date().toISOString().split('T')[0],
          items
        });
        
        // Default item assignments: all members in the group split all items
        const initialAssigns: Record<number, string[]> = {};
        items.forEach((_, idx) => {
          initialAssigns[idx] = [...group.members];
        });
        setReceiptItemAssignments(initialAssigns);
        setReceiptItemCustomAmounts({});
        // Auto-fill tax and service charge percentages from the scanned receipt
        setReceiptTaxPercent((response.taxPercent ?? 0) > 0 ? String(response.taxPercent) : '0');
        setReceiptChargePercent((response.chargePercent ?? 0) > 0 ? String(response.chargePercent) : '0');
        
        // Set payer to current user by default
        setReceiptPayerId(currentUser?.id || '');
        setReceiptSplitterOpen(true);
      } else {
        setNlpError(response.message || 'Failed to scan receipt image.');
      }
    } catch (err: any) {
      // console.error(err);
      setNlpError(err.message || 'An error occurred during receipt scanning.');
    } finally {
      setIsScanningReceipt(false);
    }
  };

  const handleAddItem = () => {
    if (!scannedReceiptData || !group) return;
    const newItem = { name: 'New Item', amount: 0 };
    const newItems = [...scannedReceiptData.items, newItem];
    const newIdx = newItems.length - 1;
    
    setReceiptItemAssignments({
      ...receiptItemAssignments,
      [newIdx]: [...group.members]
    });
    setScannedReceiptData({
      ...scannedReceiptData,
      items: newItems
    });
  };

  const handleDeleteItem = (itemIdx: number) => {
    if (!scannedReceiptData) return;
    const newItems = scannedReceiptData.items.filter((_, idx) => idx !== itemIdx);
    
    // Shift assignments & custom amounts keys
    const newAssignments: Record<number, string[]> = {};
    const newCustomAmounts: Record<number, Record<string, string>> = {};
    
    Object.keys(receiptItemAssignments).forEach((key) => {
      const idx = parseInt(key);
      if (idx < itemIdx) {
        newAssignments[idx] = receiptItemAssignments[idx];
      } else if (idx > itemIdx) {
        newAssignments[idx - 1] = receiptItemAssignments[idx];
      }
    });

    Object.keys(receiptItemCustomAmounts).forEach((key) => {
      const idx = parseInt(key);
      if (idx < itemIdx) {
        newCustomAmounts[idx] = receiptItemCustomAmounts[idx];
      } else if (idx > itemIdx) {
        newCustomAmounts[idx - 1] = receiptItemCustomAmounts[idx];
      }
    });

    setReceiptItemAssignments(newAssignments);
    setReceiptItemCustomAmounts(newCustomAmounts);
    setScannedReceiptData({
      ...scannedReceiptData,
      items: newItems
    });
  };

  // Clipboard paste listener (Ctrl+V) for receipt images
  useEffect(() => {
    if (!group) return;
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = async () => {
              const base64Image = reader.result as string;
              await processBase64Receipt(base64Image, file.name);
            };
            reader.onerror = () => {
              setNlpError('Failed to read pasted image.');
            };
            reader.readAsDataURL(file);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [group, currentUser]);

  const handleAIReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset value so selecting the same file triggers onChange again
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Image = reader.result as string;
      await processBase64Receipt(base64Image, file.name);
    };
    reader.onerror = () => {
      setNlpError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const startWebcam = async () => {
    setWebcamError(null);
    setWebcamCapturedImage(null);
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdown(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setWebcamStream(stream);
    } catch (err: any) {
      // console.error('Failed to access laptop webcam:', err);
      setWebcamError('Could not access camera. Please check your browser permissions.');
    }
  };

  const stopWebcam = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      setWebcamStream(null);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 1280;
      canvas.height = videoRef.current.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/jpeg', 0.85);
        setWebcamCapturedImage(base64);
      }
    }
  };

  const startTimerCapture = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    setCountdown(5);
    let count = 5;
    countdownIntervalRef.current = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
        setCountdown(null);
        // Trigger camera flash
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 150);
        capturePhoto();
      } else {
        setCountdown(count);
      }
    }, 1000);
  };

  const submitWebcamImage = async () => {
    if (!webcamCapturedImage) return;
    const base64 = webcamCapturedImage;
    setIsSubmittingWebcam(true);
    setWebcamScanError(null);

    if (!group) {
      setIsSubmittingWebcam(false);
      return;
    }

    try {
      const response = await scanReceiptWithAI(base64, 'webcam_capture.jpg');

      if (response.success) {
        // Receipt found — close dialog and open splitter
        handleCloseCompanionDialog();
        setScannedReceiptBase64(base64);
        const items = response.items && response.items.length > 0
          ? response.items
          : [{ name: response.description || 'Total Receipt Charge', amount: response.amount }];
        setScannedReceiptData({
          title: response.description || 'Scanned Receipt',
          amount: response.amount || items.reduce((sum, item) => sum + item.amount, 0),
          category: response.category || 'others',
          date: response.date || new Date().toISOString().split('T')[0],
          items
        });
        const initialAssigns: Record<number, string[]> = {};
        items.forEach((_, idx) => { initialAssigns[idx] = [...group.members]; });
        setReceiptItemAssignments(initialAssigns);
        setReceiptItemCustomAmounts({});
        setReceiptTaxPercent((response.taxPercent ?? 0) > 0 ? String(response.taxPercent) : '0');
        setReceiptChargePercent((response.chargePercent ?? 0) > 0 ? String(response.chargePercent) : '0');
        setReceiptPayerId(currentUser?.id || '');
        setReceiptSplitterOpen(true);
      } else {
        // No receipt detected — stay in dialog, show error
        setWebcamScanError(response.message || 'No receipt detected in the image. Please try again.');
      }
    } catch (err: any) {
      // console.error(err);
      setWebcamScanError(err.message || 'An error occurred during scanning. Please try again.');
    } finally {
      setIsSubmittingWebcam(false);
    }
  };

  // Keep video element srcObject in sync with webcamStream
  // Also re-runs when webcamCapturedImage changes (going back to live view remounts the video element)
  useEffect(() => {
    if (videoRef.current && webcamStream) {
      videoRef.current.srcObject = webcamStream;
    }
  }, [webcamStream, webcamCapturedImage]);



  const handleCloseCompanionDialog = () => {
    setCompanionDialogOpen(false);
    stopWebcam();
    setWebcamCapturedImage(null);
    setWebcamError(null);
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdown(null);
  };

  const handleStartCompanionSession = async () => {
    const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      document.getElementById('mobile-camera-capture')?.click();
      return;
    }

    try {
      setCompanionDialogOpen(true);
      // Start webcam automatically on startup
      startWebcam();
    } catch (err: any) {
      // console.error(err);
      alert('Failed to launch camera: ' + err.message);
    }
  };

  const getItemSplits = (item: { name: string; amount: number }, itemIdx: number) => {
    if (!group) return [];
    const assigned = receiptItemAssignments[itemIdx] || [];
    if (assigned.length === 0) return [];

    const customRecord = receiptItemCustomAmounts[itemIdx] || {};
    const explicitMembers = assigned.filter(
      (mid) => customRecord[mid] !== undefined && customRecord[mid] !== ''
    );
    const explicitTotal = explicitMembers.reduce(
      (sum, mid) => sum + (parseFloat(customRecord[mid]) || 0),
      0
    );
    
    const autoMembers = assigned.filter(
      (mid) => customRecord[mid] === undefined || customRecord[mid] === ''
    );
    const remainingAmount = Math.max(0, item.amount - explicitTotal);
    const autoShare = autoMembers.length > 0 ? remainingAmount / autoMembers.length : 0;

    // First round, round everything to 2 decimals
    const splits = assigned.map((mid) => {
      const isExplicit = customRecord[mid] !== undefined && customRecord[mid] !== '';
      const amt = isExplicit ? (parseFloat(customRecord[mid]) || 0) : autoShare;
      return { profile_id: mid, amount: Math.round(amt * 100) / 100, isAuto: !isExplicit };
    });

    // Check sum
    const splitsSum = splits.reduce((sum, s) => sum + s.amount, 0);
    const diff = item.amount - splitsSum;

    if (Math.abs(diff) > 0.001 && Math.abs(diff) < 0.1) {
      // Reconcile rounding error on one of the auto-split members
      const adjustTarget = splits.find(s => s.isAuto) || splits[splits.length - 1];
      if (adjustTarget) {
        adjustTarget.amount = Math.round((adjustTarget.amount + diff) * 100) / 100;
      }
    }

    return splits;
  };

  const getReceiptComputedSplits = () => {
    if (!scannedReceiptData || !group) return [];
    
    const memberShares: Record<string, number> = {};
    group.members.forEach(mid => {
      memberShares[mid] = 0;
    });

    scannedReceiptData.items.forEach((item, itemIdx) => {
      const splits = getItemSplits(item, itemIdx);
      splits.forEach(s => {
        if (memberShares[s.profile_id] !== undefined) {
          memberShares[s.profile_id] += s.amount;
        }
      });
    });

    // Apply tax and charge
    const taxRate = (parseFloat(receiptTaxPercent) || 0) / 100;
    const chargeRate = (parseFloat(receiptChargePercent) || 0) / 100;

    const finalSplits = group.members.map((mid) => {
      const baseShare = memberShares[mid] || 0;
      const amtWithTax = baseShare * (1 + taxRate + chargeRate);
      return {
        profile_id: mid,
        amount: Math.round(amtWithTax * 100) / 100
      };
    });

    // Reconcile overall rounding error
    const itemsTotal = scannedReceiptData.items.reduce((sum, item) => sum + item.amount, 0);
    const finalTotal = itemsTotal * (1 + taxRate + chargeRate);
    const splitsSum = finalSplits.reduce((sum, s) => sum + s.amount, 0);
    const diff = finalTotal - splitsSum;
    
    if (Math.abs(diff) > 0.01 && finalSplits.length > 0) {
      const splitToAdjust = finalSplits.find(s => s.amount > 0) || finalSplits[0];
      if (splitToAdjust) {
        splitToAdjust.amount = Math.round((splitToAdjust.amount + diff) * 100) / 100;
      }
    }

    return finalSplits;
  };

  // Redirect if not logged in or group not found (only when store has loaded)
  useEffect(() => {
    if (!isLoading) {
      if (!currentUser) {
        router.push('/login');
      } else if (!group) {
        router.push('/groups');
      }
    }
  }, [group, currentUser, isLoading, router]);

  if (isLoading || !currentUser || !group) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading group details...</p>
        </div>
      </div>
    );
  }

  // Group Members profile mapping
  const memberProfiles = group.members.map((mid) => profiles[mid]).filter(Boolean);

  // Calculate Group Statistics
  const groupExpenses = expenses.filter((e) => e.group_id === groupId);
  const groupSettlements = (settlements || []).filter(s => s.group_id === groupId);
  const incomingGroupPending = groupSettlements.filter(s => s.to_user === currentUser?.id && s.settled === false);
  const outgoingGroupPending = groupSettlements.filter(s => s.from_user === currentUser?.id && s.settled === false);

  const totalSpend = groupExpenses
    .filter(e => e.category !== 'settlement')
    .reduce((sum, e) => sum + e.amount, 0);

  // Calculate Balances for each member
  // Net balance = paid_by_member - owed_by_member
  const memberBalances: Record<string, { paid: number; owed: number; net: number }> = {};
  group.members.forEach((mid) => {
    memberBalances[mid] = { paid: 0, owed: 0, net: 0 };
  });

  groupExpenses.forEach((e) => {
    const isSettlement = e.category === 'settlement';
    
    // Add to payer's paid total (only if not a settlement)
    if (memberBalances[e.paid_by_id]) {
      if (!isSettlement) {
        memberBalances[e.paid_by_id].paid += e.amount;
      }
      memberBalances[e.paid_by_id].net += e.amount;
    }
    
    // Distribute splits
    e.splits.forEach((s) => {
      if (memberBalances[s.profile_id]) {
        if (!isSettlement) {
          memberBalances[s.profile_id].owed += s.amount;
        }
        memberBalances[s.profile_id].net -= s.amount;
      }
    });
  });

  // Filter and sort expenses based on search & category
  const filteredExpenses = groupExpenses
    .filter(exp => {
      const matchesSearch = exp.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || exp.category === categoryFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const getCategoryBadgeColor = (cat: string) => {
    switch (cat) {
      case 'food': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
      case 'housing': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'transport': return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20';
      case 'entertainment': return 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20';
      case 'utilities': return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20';
      case 'lodging':
      case 'accommodation':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'shopping':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'settlement': return 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20';
      case 'general':
      case 'others':
      default:
        return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700/50';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64Image = reader.result as string;
          await processBase64Receipt(base64Image, file.name);
        };
        reader.readAsDataURL(file);
      } else {
        setNlpError('Only image files are supported for receipt scanning.');
      }
    }
  };

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 relative"
    >
      <title>{group ? `${group.name} | Splitmate` : 'Group Details | Splitmate'}</title>
      {/* Drag & Drop Visual Overlay */}
      {isDraggingFile && (
        <div className="fixed inset-0 z-50 bg-emerald-500/10 backdrop-blur-sm border-4 border-dashed border-emerald-500 flex flex-col items-center justify-center pointer-events-none animate-fadeIn">
          <div className="bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col items-center gap-4 text-center max-w-sm">
            <div className="h-14 w-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center animate-bounce">
              <Upload className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">Drop Receipt Here</h3>
              <p className="text-xs text-zinc-400">Release the file to scan and split the bill with AI.</p>
            </div>
          </div>
        </div>
      )}

      {/* Back & Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Link href="/groups" className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Groups
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{group.name}</h1>
          <p className="text-sm text-zinc-400">{group.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Invite Member Trigger */}
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger render={<Button variant="outline" className="border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 flex items-center gap-1.5 font-semibold text-xs py-2 px-3 rounded-lg" />}>
              <UserPlus className="h-3.5 w-3.5" />
              Invite Member
            </DialogTrigger>
            <DialogContent className="border-zinc-200 dark:border-white/10 bg-background text-foreground max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-base font-bold flex items-center gap-1.5">
                  <UserPlus className="h-4.5 w-4.5 text-emerald-500" />
                  Invite Friend to Group
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Type their registered email to add them instantly to this splitting directory.
                </DialogDescription>
              </DialogHeader>

              {inviteError && (
                <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 p-2.5 rounded-lg">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{inviteError}</span>
                </div>
              )}

              {inviteSuccess && (
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-2.5 rounded-lg">
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  <span>{inviteSuccess}</span>
                </div>
              )}

              <form onSubmit={handleInviteMember} className="space-y-4 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="inviteEmail" className="text-xs font-bold text-zinc-600 dark:text-zinc-300">Email Address</Label>
                  <Input
                    id="inviteEmail"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => {
                      setInviteEmail(e.target.value);
                      if (inviteError) setInviteError(null);
                      if (inviteSuccess) setInviteSuccess(null);
                    }}
                    placeholder="friend@email.com"
                    className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-foreground text-xs"
                    required
                  />
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setInviteOpen(false);
                      setInviteEmail('');
                      setInviteError(null);
                      setInviteSuccess(null);
                    }}
                    className="text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                    disabled={isInviting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                    disabled={isInviting || !inviteEmail.trim()}
                  >
                    {isInviting ? 'Adding...' : 'Add Member'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Add Expense */}
          <Button
            onClick={() => setExpenseFormOpen(true)}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 flex items-center gap-1.5 font-bold shadow-sm text-xs py-2 px-3 rounded-lg"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Expense
          </Button>

          {/* Leave Group (Available to all members) */}
          <Button
            variant="outline"
            onClick={handleLeaveGroupClick}
            className="border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 hover:text-rose-500 flex items-center gap-1.5 font-semibold text-xs py-2 px-3 rounded-lg"
          >
            <LogOut className="h-3.5 w-3.5" />
            Leave Group
          </Button>

          {/* Group Settings (Visible to creator only) */}
          {group.created_by === currentUser.id && (
            <Button
              variant="outline"
              onClick={() => setGroupSettingsOpen(true)}
              className="border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-905 flex items-center gap-1.5 font-semibold text-xs py-2 px-3 rounded-lg"
            >
              <Settings className="h-3.5 w-3.5 text-zinc-550" />
              Group Settings
            </Button>
          )}

          {/* Delete Group (Visible to creator only) */}
          {group.created_by === currentUser.id && (
            <Button
              variant="outline"
              onClick={handleDeleteGroupClick}
              className="border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 hover:text-rose-500 flex items-center gap-1.5 font-semibold text-xs py-2 px-3 rounded-lg"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Group
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-3">
        <Card className="border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/50 text-foreground dark:text-white">
          <CardHeader className="py-4">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Total Group Spending</span>
          </CardHeader>
          <CardContent className="pb-4">
            <h3 className="text-2xl font-black text-zinc-900 dark:text-white">RM {totalSpend.toFixed(2)}</h3>
            <p className="text-[10px] text-zinc-500 mt-1">Excludes direct settlements</p>
          </CardContent>
        </Card>

        {/* User Balance within group */}
        {(() => {
          const userBalance = memberBalances[currentUser.id]?.net || 0;
          return (
            <Card className="border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/50 text-foreground dark:text-white">
              <CardHeader className="py-4">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Your Balance in Group</span>
              </CardHeader>
              <CardContent className="pb-4">
                <h3 className={`text-2xl font-black ${userBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {userBalance >= 0 ? '+' : '-'}RM {Math.abs(userBalance).toFixed(2)}
                </h3>
                <p className="text-[10px] text-zinc-500 mt-1">
                  {userBalance >= 0 ? 'You are owed in this group' : 'You owe group members'}
                </p>
              </CardContent>
            </Card>
          );
        })()}

        <Card className="border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/50 text-foreground dark:text-white">
          <CardHeader className="py-4">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Members Network</span>
          </CardHeader>
          <CardContent className="pb-4 flex items-center gap-2">
            <span className="text-2xl font-black text-zinc-800 dark:text-zinc-200">{memberProfiles.length}</span>
            <div className="flex -space-x-1.5 overflow-hidden">
              {memberProfiles.slice(0, 5).map((member) => (
                <Avatar key={member.id} className="h-6 w-6 ring-2 ring-white dark:ring-zinc-900">
                  <AvatarImage src={member.avatar_url} />
                  <AvatarFallback className="bg-zinc-100 dark:bg-zinc-800 text-[8px] text-zinc-600 dark:text-zinc-300">
                    {member.display_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Natural Language Quick Log Bar */}
      <Card className="border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/30 relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/5 to-teal-600/5 opacity-50 transition duration-300 group-hover:opacity-100" />
        <CardContent className="p-4 sm:p-5 relative z-10">
          <form onSubmit={handleNLPSubmit} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Sparkles className="h-4 w-4 animate-pulse" />
              </div>
              <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">AI Quick Log:</span>
            </div>
            <div className="relative flex-1">
              <input
                type="text"
                value={nlpText}
                onChange={(e) => {
                  setNlpText(e.target.value);
                  if (nlpError) setNlpError(null);
                  if (nlpSuccess) setNlpSuccess(null);
                }}
                disabled={isParsingNLP || isScanningReceipt}
                placeholder='Try: "Ali paid RM45 for dinner, me and Reza split equally" or upload a receipt'
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/80 px-4 py-2.5 text-sm text-foreground placeholder-zinc-500 focus:border-emerald-500 focus:outline-none disabled:opacity-50"
              />
            </div>
            <Button
              type="submit"
              disabled={isParsingNLP || isScanningReceipt || !nlpText.trim()}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shrink-0 text-xs font-semibold flex items-center gap-1.5"
            >
              {isParsingNLP ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Parsing...
                </>
              ) : (
                <>
                  <ArrowRight className="h-3.5 w-3.5" />
                  Parse Text
                </>
              )}
            </Button>
          </form>

          {/* Dynamic AI Quick Suggestions Chips */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 mr-1">Suggestions:</span>
            
            {/* Combined Scan Receipt Dropdown */}
            <div className="relative">
              <button
                ref={scanBtnRef}
                type="button"
                onClick={() => {
                  if (!scanMenuOpen && scanBtnRef.current) {
                    const r = scanBtnRef.current.getBoundingClientRect();
                    setScanMenuRect({ top: r.bottom + 6, left: r.left });
                  }
                  setScanMenuOpen(!scanMenuOpen);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/20 dark:border-emerald-500/30 hover:border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 font-bold transition-all duration-200 cursor-pointer shadow-sm active:scale-95"
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0 animate-pulse text-emerald-500" />
                <span>Scan Receipt</span>
                <ChevronDown className="h-3 w-3 shrink-0 opacity-70" />
              </button>

              {scanMenuOpen && scanMenuRect && (
                <>
                  {/* Invisible backdrop overlay to capture outside clicks */}
                  <div className="fixed inset-0 z-40" onClick={() => setScanMenuOpen(false)} />
                  
                  {/* Dropdown Menu - fixed positioned to escape any overflow clipping */}
                  <div
                    style={{ top: scanMenuRect.top, left: scanMenuRect.left }}
                    className="fixed w-52 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-1.5 shadow-2xl z-50"
                  >
                    <label className="flex w-full items-center gap-2 px-3 py-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg cursor-pointer transition-colors">
                      <Upload className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>Upload Receipt File</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          setScanMenuOpen(false);
                          handleAIReceiptUpload(e);
                        }}
                        disabled={isParsingNLP || isScanningReceipt}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setScanMenuOpen(false);
                        handleStartCompanionSession();
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg cursor-pointer transition-colors text-left"
                    >
                      <Camera className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>Scan via Camera</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {(() => {
              const otherMembers = memberProfiles
                .filter(m => m.id !== currentUser.id)
                .map(m => m.display_name.split(' ')[0]);
              
              const roommateName = otherMembers[0] || 'Roommate';
              const thirdPersonName = otherMembers[1] || 'Jessica';

              const suggestions = [
                {
                  label: '🍕 Dinner split',
                  text: `I paid 45rm for dinner at Mamak, split equally with ${roommateName}`,
                },
                {
                  label: '🏠 Rent split',
                  text: `I paid 1800rm for housing rent, split equally with ${roommateName} and ${thirdPersonName}`,
                },
                {
                  label: '🚕 Grab ride',
                  text: `${roommateName} paid 30rm for Grab to campus, split with me`,
                },
                {
                  label: '💡 Utilities',
                  text: `I paid 120rm for Wifi, split equally with ${roommateName}`,
                }
              ];

              return suggestions.map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setNlpText(sug.text);
                    if (nlpError) setNlpError(null);
                    if (nlpSuccess) setNlpSuccess(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-zinc-200 dark:border-white/5 hover:border-emerald-500/30 dark:hover:border-emerald-500/30 bg-zinc-50 hover:bg-emerald-500/5 dark:bg-zinc-950/40 dark:hover:bg-emerald-500/5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-all duration-200"
                >
                  {sug.label}
                </button>
              ));
            })()}
          </div>
          {isScanningReceipt && (
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-2.5 rounded-lg mt-3 animate-pulse">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500 shrink-0" />
              <span>AI is scanning receipt details & line items...</span>
            </div>
          )}
          {nlpError && (
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-2 flex items-center gap-1 animate-fadeIn">
              <AlertCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
              {nlpError}
            </p>
          )}
          {nlpSuccess && (
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1 animate-fadeIn">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              {nlpSuccess}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Main Grid: Split Layout */}
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left columns - Tabs for Expenses list vs Balances Table */}
        <div className="lg:col-span-7 xl:col-span-8">
          <Tabs defaultValue="expenses" className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/5 pb-2">
              <TabsList className="bg-zinc-100 dark:bg-zinc-900 p-0.5 border border-zinc-200 dark:border-white/5">
                <TabsTrigger value="expenses" className="data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:text-zinc-950 data-[state=active]:shadow-sm dark:data-[state=active]:text-white text-zinc-500 dark:text-zinc-400 text-xs font-semibold rounded-md px-4 py-1.5 capitalize">
                  Expenses
                </TabsTrigger>
                <TabsTrigger value="balances" className="data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:text-zinc-950 data-[state=active]:shadow-sm dark:data-[state=active]:text-white text-zinc-500 dark:text-zinc-400 text-xs font-semibold rounded-md px-4 py-1.5 capitalize">
                  Balances Breakdown
                </TabsTrigger>
                <TabsTrigger value="analytics" className="data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:text-zinc-950 data-[state=active]:shadow-sm dark:data-[state=active]:text-white text-zinc-500 dark:text-zinc-400 text-xs font-semibold rounded-md px-4 py-1.5 capitalize">
                  Analytics
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Expenses Tab */}
            <TabsContent value="expenses" className="space-y-4 focus:outline-none">
              {/* Search & Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search expenses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 pl-10 pr-4 py-2 text-sm text-foreground dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-zinc-400" />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 px-3 py-2 text-sm text-foreground dark:text-zinc-300 focus:border-emerald-500 focus:outline-none capitalize"
                  >
                    <option value="all">All Categories</option>
                    <option value="food">Food</option>
                    <option value="housing">Housing</option>
                    <option value="transport">Transport</option>
                    <option value="entertainment">Entertainment</option>
                    <option value="utilities">Utilities</option>
                    <option value="lodging">Lodging</option>
                    <option value="settlement">Settlements</option>
                    <option value="general">General</option>
                  </select>
                </div>
              </div>

              {/* Expenses List */}
              {groupExpenses.length === 0 ? (
                <div className="text-center py-16 px-6 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-zinc-50/50 dark:bg-zinc-950/20 max-w-xl mx-auto flex flex-col items-center gap-5 my-6 animate-fadeIn">
                  <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center animate-bounce shadow-inner">
                    <ReceiptText className="h-7 w-7 text-emerald-500" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">No expenses logged yet</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
                      Split bills, scan receipts, and settle balances with your group members. Add your first shared bill to get started!
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mt-2">
                    <Button
                      onClick={() => setExpenseFormOpen(true)}
                      className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 font-bold shadow-md shadow-emerald-500/10 flex items-center justify-center gap-2 rounded-xl h-10 px-5"
                    >
                      <Plus className="h-4 w-4" />
                      Log First Expense
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleStartCompanionSession()}
                      className="w-full sm:w-auto border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 font-bold flex items-center justify-center gap-2 rounded-xl h-10 px-5"
                    >
                      <Sparkles className="h-4 w-4 text-emerald-500" />
                      Scan Receipt
                    </Button>
                  </div>
                </div>
              ) : filteredExpenses.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-sm border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50 dark:bg-zinc-900/10">
                  No expenses match your search.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredExpenses.map((exp) => {
                    const payer = profiles[exp.paid_by_id];
                    const isSettlement = exp.category === 'settlement';
                    const isUserPayer = exp.paid_by_id === currentUser.id;
                    const userSplit = exp.splits.find(s => s.profile_id === currentUser.id);

                    return (
                      <div
                        key={exp.id}
                        onClick={() => setSelectedDetailExpense(exp)}
                        className={`group rounded-xl border p-4 transition-all duration-200 cursor-pointer ${
                          isSettlement 
                            ? 'border-teal-500/20 bg-teal-500/5 dark:border-teal-500/10 dark:bg-teal-950/5' 
                            : 'border-zinc-200 dark:border-white/5 bg-white dark:bg-zinc-900/20 hover:border-zinc-300 dark:hover:border-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                           <div className="flex items-center gap-3 truncate">
                            <div className={`h-10 w-10 shrink-0 rounded-xl border flex items-center justify-center ${getCategoryBadgeColor(exp.category)}`}>
                              {getCategoryIcon(exp.category)}
                            </div>
                            <div className="truncate">
                              <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 truncate">{exp.description}</h4>
                              <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-500 mt-1">
                                <span>Paid by <span className="font-semibold text-zinc-700 dark:text-zinc-300">{payer?.display_name || 'Someone'}</span></span>
                                <span>•</span>
                                <span>
                                  {new Date(exp.created_at).toLocaleString('en-US', { 
                                    year: 'numeric', 
                                    month: 'short', 
                                    day: 'numeric', 
                                    hour: 'numeric', 
                                    minute: '2-digit' 
                                  })}
                                </span>
                                {exp.category !== 'settlement' && (
                                  <>
                                    <span>•</span>
                                    <span className="text-[10px] uppercase font-bold text-zinc-500">{exp.splits.length} split shares</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 shrink-0 text-right">
                            <div>
                              <p className={`text-base font-extrabold ${isSettlement ? 'text-teal-600 dark:text-teal-400' : 'text-zinc-800 dark:text-zinc-200'}`}>
                                RM {exp.amount.toFixed(2)}
                              </p>
                              {/* Display what user owes/gets for this specific expense */}
                              {exp.category !== 'settlement' && (
                                <p className={`text-[10px] font-semibold mt-0.5 ${
                                  isUserPayer
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : userSplit
                                      ? 'text-rose-600 dark:text-rose-400'
                                      : 'text-zinc-500'
                                }`}>
                                  {isUserPayer 
                                    ? `You lent RM ${(exp.amount - (userSplit?.amount || 0)).toFixed(2)}` 
                                    : userSplit 
                                      ? `You owe RM ${userSplit.amount.toFixed(2)}` 
                                      : 'Not involved'
                                  }
                                </p>
                              )}
                            </div>

                             {/* Edit Button (Allowed for current user or expense creator) */}
                             {(isUserPayer || exp.created_by === currentUser.id) && (
                               <Button
                                 size="icon"
                                 variant="ghost"
                                 onClick={(e) => { e.stopPropagation(); handleEditExpenseClick(exp); }}
                                 className="opacity-40 sm:opacity-0 hover:opacity-100 sm:group-hover:opacity-100 transition h-8 w-8 text-zinc-500 hover:text-emerald-500 hover:bg-emerald-500/10"
                               >
                                 <Pencil className="h-4 w-4" />
                               </Button>
                             )}

                             {/* Delete Button (Allowed for current user or expense creator) */}
                             {(isUserPayer || exp.created_by === currentUser.id) && (
                               <Button
                                 size="icon"
                                 variant="ghost"
                                 onClick={(e) => { e.stopPropagation(); setExpenseToDelete(exp.id); }}
                                 className="opacity-40 sm:opacity-0 hover:opacity-100 sm:group-hover:opacity-100 transition h-8 w-8 text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10"
                               >
                                 <Trash2 className="h-4 w-4" />
                               </Button>
                             )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Balances Breakdown Tab */}
            <TabsContent value="balances" className="focus:outline-none">
              <Card className="border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/30 text-foreground dark:text-white">
                <CardHeader>
                  <CardTitle className="text-base font-bold">Group Member Ledger</CardTitle>
                  <CardDescription className="text-zinc-500 dark:text-zinc-400">Total spent versus owes per individual.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table className="border-zinc-200 dark:border-zinc-800">
                    <TableHeader className="bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-zinc-800">
                      <TableRow className="border-zinc-200 dark:border-zinc-800 hover:bg-transparent">
                        <TableHead className="text-zinc-500 dark:text-zinc-400 font-semibold text-xs">Member</TableHead>
                        <TableHead className="text-zinc-500 dark:text-zinc-400 font-semibold text-xs text-right">Paid</TableHead>
                        <TableHead className="text-zinc-500 dark:text-zinc-400 font-semibold text-xs text-right">Owes</TableHead>
                        <TableHead className="text-zinc-500 dark:text-zinc-400 font-semibold text-xs text-right">Net Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {memberProfiles.map((member) => {
                        const bal = memberBalances[member.id] || { paid: 0, owed: 0, net: 0 };
                        return (
                          <TableRow key={member.id} className="border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-white/5">
                            <TableCell className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={member.avatar_url} />
                                <AvatarFallback className="bg-zinc-100 dark:bg-zinc-800 text-xs text-zinc-600 dark:text-zinc-300">
                                  {member.display_name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">{member.display_name}</span>
                            </TableCell>
                            <TableCell className="text-right text-sm text-zinc-500 dark:text-zinc-400">RM {bal.paid.toFixed(2)}</TableCell>
                            <TableCell className="text-right text-sm text-zinc-500 dark:text-zinc-400">RM {bal.owed.toFixed(2)}</TableCell>
                            <TableCell className={`text-right text-sm font-extrabold ${bal.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {bal.net >= 0 ? '+' : '-'}RM {Math.abs(bal.net).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="focus:outline-none">
              <Card className="border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/30 text-foreground dark:text-white shadow-sm rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base font-bold">Group Spending Insights</CardTitle>
                  <CardDescription className="text-zinc-500 dark:text-zinc-400">Visual breakdown of group expenditures by category.</CardDescription>
                </CardHeader>
                <CardContent className="max-w-md mx-auto py-4">
                  {(() => {
                    const groupCategoryTotals: Record<string, number> = {};
                    let groupTotalSpending = 0;
                    groupExpenses.filter(e => e.category !== 'settlement').forEach(e => {
                      groupCategoryTotals[e.category] = (groupCategoryTotals[e.category] || 0) + e.amount;
                      groupTotalSpending += e.amount;
                    });
                    
                    return (
                      <SpendingChart
                        categoryTotals={groupCategoryTotals}
                        totalSpending={groupTotalSpending}
                      />
                    );
                  })()}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right column - Settle Debts visualizer */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          {/* Group Pending Settlements Card */}
          {(incomingGroupPending.length > 0 || outgoingGroupPending.length > 0) && (
            <Card className="border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 text-foreground dark:text-white shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <span className="h-3 w-1 rounded-full bg-amber-500 shrink-0 animate-pulse" />
                  Pending Settlements
                </CardTitle>
                <CardDescription className="text-zinc-500 dark:text-zinc-400 text-xs">
                  Recorded payments awaiting confirmation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Incoming Pending (Awaiting current user approval) */}
                {incomingGroupPending.map((settlement) => {
                  const payer = profiles[settlement.from_user];
                  return (
                    <div
                      key={settlement.id}
                      className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/40 p-3 space-y-2 animate-fadeIn"
                    >
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold">
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">{payer?.display_name || 'Someone'}</span> paid you
                        </span>
                        <span className="font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                          RM {settlement.amount.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-900/80">
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => declineSettlement(settlement.id)}
                          className="flex-1 text-[10px] font-bold text-rose-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg h-7"
                        >
                          Decline
                        </Button>
                        <Button
                          size="xs"
                          onClick={() => confirmSettlement(settlement.id)}
                          className="flex-1 text-[10px] font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-650 rounded-lg h-7"
                        >
                          Confirm
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {/* Outgoing Pending (Awaiting recipient approval) */}
                {outgoingGroupPending.map((settlement) => {
                  const recipient = profiles[settlement.to_user];
                  return (
                    <div
                      key={settlement.id}
                      className="flex justify-between items-center rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 p-3 text-xs bg-zinc-50/20 dark:bg-zinc-900/10"
                    >
                      <div className="flex flex-col">
                        <span className="text-zinc-605 dark:text-zinc-400 font-medium">
                          Sent to <span className="font-bold text-zinc-800 dark:text-zinc-250">{recipient?.display_name || 'Someone'}</span>
                        </span>
                        <span className="text-[10px] text-zinc-450 dark:text-zinc-500 italic mt-0.5 animate-pulse">Awaiting confirmation...</span>
                      </div>
                      <span className="font-extrabold font-mono text-zinc-700 dark:text-zinc-300">
                        RM {settlement.amount.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          <DebtVisualizer groupId={groupId} />

          {/* Personal Payment QR Code card */}
          {currentUser && (
            <Card className="border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/30 text-foreground dark:text-white shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <QrCode className="h-4.5 w-4.5 text-pink-500 shrink-0" />
                  Your Payment QR Code
                </CardTitle>
                <CardDescription className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed">
                  Upload a payment QR screenshot (DuitNow / TNG) for other members to settle debts with you.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* QR Code Container */}
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="relative h-32 w-32 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white p-2 flex items-center justify-center shadow-inner overflow-hidden select-none">
                    {currentUser.qr_code_url ? (
                      <>
                        <img
                          src={currentUser.qr_code_url}
                          alt="Your Payment QR Code Preview"
                          className="h-full w-full object-contain"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveQrCode}
                          className="absolute -top-1 -right-1 p-1 bg-rose-500 text-white rounded-full hover:bg-rose-600 shadow transition active:scale-90 cursor-pointer"
                          title="Remove QR code"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </>
                    ) : (
                      <div className="text-center text-zinc-400 dark:text-zinc-650">
                        <QrCode className="h-10 w-10 mx-auto opacity-35 text-pink-500" />
                        <span className="text-[9px] font-bold uppercase tracking-wider block mt-1">No QR Code</span>
                      </div>
                    )}
                  </div>

                  {/* Actions and Status */}
                  <div className="w-full text-center space-y-3">
                    {currentUser.qr_code_url && (
                      <div className="w-full text-left space-y-1 mt-1 mb-2 px-1">
                        <Label htmlFor="qr-label-input" className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          QR Code Label / Provider
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="qr-label-input"
                            type="text"
                            placeholder="e.g. TnG, Maybank, DuitNow"
                            value={qrCodeLabel}
                            onChange={(e) => setQrCodeLabel(e.target.value)}
                            onBlur={handleSaveQrLabel}
                            onKeyDown={handleKeyDownQrLabel}
                            className="h-8 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs rounded-xl px-3 focus-visible:ring-1 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 text-foreground dark:text-white flex-1"
                          />
                          {isSavingLabel && (
                            <span className="text-[10px] text-zinc-400 self-center animate-pulse shrink-0">Saving...</span>
                          )}
                        </div>
                      </div>
                    )}

                    {qrUploadError && (
                      <p className="text-[10px] font-bold text-rose-500">{qrUploadError}</p>
                    )}
                    {qrUploadSuccess && (
                      <p className="text-[10px] font-bold text-emerald-500">{qrUploadSuccess}</p>
                    )}

                    <div className="flex items-center justify-center gap-2">
                      <Label
                        htmlFor="group-qr-file-upload"
                        className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white px-3.5 py-2 text-xs font-bold rounded-xl cursor-pointer transition flex items-center gap-1.5 shadow-sm border border-zinc-200/50 dark:border-white/5"
                      >
                        {isUploadingQr ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500" />
                        ) : (
                          <Plus className="h-3.5 w-3.5 text-pink-500" />
                        )}
                        {currentUser.qr_code_url ? 'Replace QR' : 'Upload QR Code'}
                        <input
                          id="group-qr-file-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleQrCodeFileUpload}
                          disabled={isUploadingQr}
                        />
                      </Label>
                      {currentUser.qr_code_url && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={handleRemoveQrCode}
                          className="text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-xl"
                        >
                          Remove QR
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Members' Payment QRs Card */}
          {(() => {
            const otherMembersWithQr = memberProfiles.filter(
              (m) => m.id !== currentUser?.id && m.qr_code_url
            );

            return (
              <Card className="border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/30 text-foreground dark:text-white shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <QrCode className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                    Members' Payment QRs
                  </CardTitle>
                  <CardDescription className="text-zinc-500 dark:text-zinc-400 text-xs">
                    Quickly view payment codes uploaded by other group members.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {otherMembersWithQr.length > 0 ? (
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {otherMembersWithQr.map((member) => (
                        <div key={member.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar className="h-8 w-8 ring-1 ring-zinc-200 dark:ring-white/10 shrink-0">
                              <AvatarImage src={member.avatar_url} alt={member.display_name} />
                              <AvatarFallback className="bg-zinc-100 dark:bg-zinc-800 text-[10px] font-semibold text-zinc-500">
                                {member.display_name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{member.display_name}</p>
                              <span className="inline-block text-[9px] font-extrabold text-pink-500 bg-pink-50 dark:bg-pink-950/30 px-2 py-0.5 rounded-full border border-pink-100 dark:border-pink-950/50 mt-0.5 uppercase tracking-wider">
                                {member.qr_code_label || 'DuitNow'}
                              </span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setZoomedQrUrl(member.qr_code_url || null);
                              setZoomedQrLabel(member.qr_code_label || 'DuitNow');
                              setZoomedQrName(member.display_name.split(' ')[0]);
                            }}
                            className="text-xs font-semibold px-3 py-1.5 h-8 rounded-xl border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 shrink-0"
                          >
                            View QR
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-zinc-450 dark:text-zinc-500 text-xs">
                      <p>No other members have uploaded a payment QR code yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}
        </div>
      </div>

      {/* Create Expense Form Modal */}
      {expenseFormOpen && (
        <ExpenseForm
          groupId={groupId}
          isOpen={expenseFormOpen}
          onClose={() => {
            setExpenseFormOpen(false);
            setNlpInitialData(null); // clear initialData on close
          }}
          initialData={nlpInitialData}
        />
      )}

      {/* AI Receipt Splitter Modal */}
      {receiptSplitterOpen && scannedReceiptData && (
        <Dialog open={receiptSplitterOpen} onOpenChange={setReceiptSplitterOpen}>
          <DialogContent className="w-full sm:max-w-5xl max-h-[90vh] overflow-y-auto border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 text-foreground shadow-2xl p-6 rounded-2xl scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
            <DialogHeader className="space-y-1.5">
              <DialogTitle className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 animate-pulse">
                  <Sparkles className="h-5 w-5" />
                </div>
                AI Receipt Splitter
              </DialogTitle>
              <DialogDescription className="text-zinc-500 dark:text-zinc-400 text-sm">
                AI successfully scanned your receipt! Adjust item amounts individually or toggle who spent on them.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-4">
              {/* Left Column: Sticky Receipt Image Preview */}
              <div className="lg:col-span-5 lg:sticky lg:top-0 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Receipt Image</Label>
                  <span className="text-[10px] bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 px-2 py-0.5 rounded-full font-bold">Zoom & Rotate Enabled</span>
                </div>
                {scannedReceiptBase64 ? (
                  <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-950/20 aspect-[3/4] flex items-center justify-center shadow-inner">
                    <img
                      src={scannedReceiptBase64}
                      alt="Scanned receipt"
                      style={{
                        transform: `scale(${splitterZoom}) rotate(${splitterRotate}deg)`,
                        transition: 'transform 200ms ease-out'
                      }}
                      className="max-h-full max-w-full object-contain pointer-events-none select-none"
                    />

                    {/* Image manipulation controls Overlay */}
                    <div className="absolute bottom-3 right-3 flex gap-1 bg-black/60 backdrop-blur-md p-1 rounded-xl border border-white/10 z-10">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => setSplitterZoom(prev => Math.min(3, prev + 0.2))}
                        className="h-7 w-7 text-white hover:text-emerald-400 hover:bg-white/10 rounded-lg"
                        title="Zoom In"
                      >
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => setSplitterZoom(prev => Math.max(0.5, prev - 0.2))}
                        className="h-7 w-7 text-white hover:text-emerald-400 hover:bg-white/10 rounded-lg"
                        title="Zoom Out"
                      >
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => setSplitterRotate(prev => (prev + 90) % 360)}
                        className="h-7 w-7 text-white hover:text-emerald-400 hover:bg-white/10 rounded-lg"
                        title="Rotate"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => { setSplitterZoom(1); setSplitterRotate(0); }}
                        className="h-7 w-7 text-white hover:text-emerald-400 hover:bg-white/10 rounded-lg"
                        title="Reset"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 p-8 text-center text-xs text-zinc-400">
                    No receipt image data available.
                  </div>
                )}
              </div>

              {/* Right Column: Editor Details */}
              <div className="lg:col-span-7 space-y-6">
                {/* Receipt metadata edits (Modern 2x2 Grid) */}
                <div className="grid grid-cols-2 gap-4 bg-zinc-50/50 dark:bg-zinc-900/20 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <div className="space-y-1.5">
                    <Label htmlFor="rc-title" className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Description</Label>
                    <Input
                      id="rc-title"
                      value={scannedReceiptData.title}
                      onChange={(e) => setScannedReceiptData({ ...scannedReceiptData, title: e.target.value })}
                      className="h-11 text-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-foreground rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 px-4 transition-all duration-200 font-semibold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rc-date" className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Receipt Date</Label>
                    <Input
                      id="rc-date"
                      type="date"
                      value={scannedReceiptData.date}
                      onChange={(e) => setScannedReceiptData({ ...scannedReceiptData, date: e.target.value })}
                      className="h-11 text-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-foreground rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 px-4 transition-all duration-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rc-category" className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Category</Label>
                    <select
                      id="rc-category"
                      value={scannedReceiptData.category}
                      onChange={(e) => setScannedReceiptData({ ...scannedReceiptData, category: e.target.value })}
                      className="w-full h-11 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 text-foreground focus:border-emerald-500 focus:outline-none capitalize font-semibold transition-all duration-200"
                    >
                      <option value="food">Food & Dining</option>
                      <option value="transport">Transport & Fuel</option>
                      <option value="accommodation">Accommodation</option>
                      <option value="shopping">Shopping & Groceries</option>
                      <option value="housing">Rent & Housing</option>
                      <option value="utilities">Bills & Utilities</option>
                      <option value="entertainment">Entertainment</option>
                      <option value="others">Others</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rc-payer" className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Paid By</Label>
                    <select
                      id="rc-payer"
                      value={receiptPayerId}
                      onChange={(e) => setReceiptPayerId(e.target.value)}
                      className="w-full h-11 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 text-foreground focus:border-emerald-500 focus:outline-none font-semibold transition-all duration-200"
                    >
                      {memberProfiles.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.display_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Checklist items section */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-1">
                    <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Who spent on which items?</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        onClick={handleAddItem}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold h-7 py-1 px-2.5 rounded-lg flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        Add Item
                      </Button>
                      <span className="text-xs font-bold text-zinc-400 uppercase bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-1 rounded-full">
                        {scannedReceiptData.items.length} Items
                      </span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {scannedReceiptData.items.map((item, itemIdx) => {
                      const assigned = receiptItemAssignments[itemIdx] || [];
                      const customRecord = receiptItemCustomAmounts[itemIdx] || {};
                      
                      // Auto share placeholder math
                      const explicitMembers = assigned.filter(mid => customRecord[mid] !== undefined && customRecord[mid] !== '');
                      const explicitTotal = explicitMembers.reduce((sum, mid) => sum + (parseFloat(customRecord[mid]) || 0), 0);
                      const remainingAmount = Math.max(0, item.amount - explicitTotal);
                      const autoMembers = assigned.filter(mid => customRecord[mid] === undefined || customRecord[mid] === '');
                      const autoShare = autoMembers.length > 0 ? remainingAmount / autoMembers.length : 0;
                      
                      const itemSplits = getItemSplits(item, itemIdx);
                      const splitsSum = itemSplits.reduce((sum, s) => sum + s.amount, 0);
                      const isOver = Math.abs(splitsSum - item.amount) > 0.05 && explicitMembers.length === assigned.length;

                      return (
                        <div key={itemIdx} className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200/85 dark:border-zinc-800/90 p-5 space-y-4 shadow-sm hover:border-emerald-500/30 transition-all duration-200">
                          <div className="flex items-center gap-2">
                            <Input
                              type="text"
                              value={item.name}
                              onChange={(e) => {
                                const newItems = [...scannedReceiptData.items];
                                newItems[itemIdx] = { ...item, name: e.target.value };
                                setScannedReceiptData({ ...scannedReceiptData, items: newItems });
                              }}
                              className="h-10 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-bold text-sm rounded-xl focus:border-emerald-500 px-3 flex-1"
                              placeholder="Item Name"
                            />
                            
                            <div className="relative w-28 shrink-0">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-extrabold text-emerald-600 dark:text-emerald-400 select-none">RM</span>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.amount || ''}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  const newItems = [...scannedReceiptData.items];
                                  newItems[itemIdx] = { ...item, amount: val };
                                  setScannedReceiptData({ ...scannedReceiptData, items: newItems });
                                }}
                                className="h-10 pl-9 pr-2 text-right border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-emerald-600 dark:text-emerald-400 font-extrabold font-mono text-sm rounded-xl focus:border-emerald-500"
                                placeholder="0.00"
                              />
                            </div>

                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteItem(itemIdx)}
                              className="h-10 w-10 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl shrink-0"
                              title="Delete Item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Member Checklist Shortcuts (Select All / Clear All) */}
                          <div className="flex items-center justify-between border-t border-b border-zinc-200/50 dark:border-zinc-800/50 py-2 text-xs font-semibold">
                            <span className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400">
                              Split with ({assigned.length} {assigned.length === 1 ? 'person' : 'people'})
                            </span>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setReceiptItemAssignments({
                                    ...receiptItemAssignments,
                                    [itemIdx]: [...group.members]
                                  });
                                }}
                                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 cursor-pointer hover:underline"
                              >
                                Select All
                              </button>
                              <span className="text-zinc-300 dark:text-zinc-800 select-none">|</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setReceiptItemAssignments({
                                    ...receiptItemAssignments,
                                    [itemIdx]: []
                                  });
                                  const nextCustoms = { ...customRecord };
                                  group.members.forEach(mid => delete nextCustoms[mid]);
                                  setReceiptItemCustomAmounts({
                                    ...receiptItemCustomAmounts,
                                    [itemIdx]: nextCustoms
                                  });
                                }}
                                className="text-xs font-bold text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 cursor-pointer hover:underline"
                              >
                                Clear All
                              </button>
                            </div>
                          </div>
                          
                          {/* All members — toggle highlight */}
                          <div className="space-y-2">
                            {memberProfiles.map((member) => {
                              const isAssigned = assigned.includes(member.id);
                              const isExplicit = customRecord[member.id] !== undefined && customRecord[member.id] !== '';
                              const val = customRecord[member.id] || '';
                              const calculatedVal = isExplicit ? parseFloat(val) || 0 : autoShare;

                              return (
                                <div
                                  key={member.id}
                                  onClick={() => {
                                    if (isAssigned) {
                                      const nextAssigned = assigned.filter(id => id !== member.id);
                                      setReceiptItemAssignments({ ...receiptItemAssignments, [itemIdx]: nextAssigned });
                                      const nextCustoms = { ...customRecord };
                                      delete nextCustoms[member.id];
                                      setReceiptItemCustomAmounts({ ...receiptItemCustomAmounts, [itemIdx]: nextCustoms });
                                    } else {
                                      setReceiptItemAssignments({ ...receiptItemAssignments, [itemIdx]: [...assigned, member.id] });
                                    }
                                  }}
                                  className={`group flex items-center justify-between gap-4 px-4 py-3 rounded-xl border text-sm cursor-pointer select-none transition-all duration-200 ${
                                    isAssigned
                                      ? 'bg-white dark:bg-zinc-900 border-emerald-500/40 dark:border-emerald-500/30 shadow-md shadow-emerald-500/5 hover:border-rose-400/40 dark:hover:border-rose-500/30'
                                      : 'bg-zinc-50/50 dark:bg-zinc-900/20 border-zinc-200 dark:border-zinc-800/40 opacity-40 hover:opacity-60'
                                  }`}
                                >
                                  {/* Left — checkmark + name */}
                                  <div className="flex items-center gap-3">
                                    <div className={`relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                                      isAssigned
                                        ? 'bg-emerald-500 border-emerald-500 group-hover:bg-rose-500 group-hover:border-rose-500'
                                        : 'bg-transparent border-zinc-300 dark:border-zinc-700'
                                    }`}>
                                      {isAssigned && (
                                        <>
                                          {/* Checkmark — visible by default, hidden on hover */}
                                          <svg className="h-3 w-3 text-white transition-opacity duration-150 group-hover:opacity-0" viewBox="0 0 12 12" fill="none">
                                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                          </svg>
                                          {/* X — hidden by default, visible on hover */}
                                          <svg className="absolute h-3 w-3 text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100" viewBox="0 0 12 12" fill="none">
                                            <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                          </svg>
                                        </>
                                      )}
                                    </div>
                                    <span className={`font-semibold transition-colors duration-200 ${
                                      isAssigned ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-500 dark:text-zinc-500'
                                    }`}>
                                      {member.display_name}
                                    </span>
                                  </div>

                                  {/* Right — amount input (only when assigned) */}
                                  {isAssigned ? (
                                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                      <span className="text-xs text-zinc-400 dark:text-zinc-500 font-extrabold select-none">RM</span>
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={val}
                                        placeholder={calculatedVal.toFixed(2)}
                                        onChange={(e) => {
                                          const nextRecord = { ...customRecord, [member.id]: e.target.value };
                                          setReceiptItemCustomAmounts({ ...receiptItemCustomAmounts, [itemIdx]: nextRecord });
                                        }}
                                        className="w-24 h-9 border border-emerald-500/30 rounded-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none font-mono font-bold text-right text-sm transition-all duration-200"
                                      />
                                    </div>
                                  ) : (
                                    <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-650 italic select-none">not split</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* 0 members warning */}
                          {assigned.length === 0 && (
                            <div className="flex items-center gap-2 p-2.5 rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-450 text-xs font-bold animate-fadeIn">
                              <AlertCircle className="h-4 w-4 shrink-0 text-amber-500 animate-pulse" />
                              <span>Select at least 1 member to split this item</span>
                            </div>
                          )}

                          {/* Discrepancy warning */}
                          {isOver && (
                            <div className="flex items-center gap-2 p-2.5 rounded-lg border border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-450 text-xs font-bold animate-fadeIn">
                              <AlertCircle className="h-4 w-4 shrink-0" />
                              <span>Mismatch: Share total (RM {splitsSum.toFixed(2)}) must equal item total (RM {item.amount.toFixed(2)})</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Service Tax and Service Charges input section */}
                <div className="grid grid-cols-2 gap-4 bg-zinc-50/50 dark:bg-zinc-900/20 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <div className="space-y-1.5">
                    <Label htmlFor="rc-tax" className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Sales Tax / GST / SST (%)</Label>
                    <div className="relative">
                      <Input
                        id="rc-tax"
                        type="number"
                        value={receiptTaxPercent}
                        onChange={(e) => setReceiptTaxPercent(e.target.value)}
                        placeholder="0"
                        className="h-11 pr-8 text-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-foreground focus:border-emerald-500 font-semibold text-right"
                      />
                      <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm font-bold text-zinc-400 select-none">%</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rc-charge" className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Service Charge / Tip (%)</Label>
                    <div className="relative">
                      <Input
                        id="rc-charge"
                        type="number"
                        value={receiptChargePercent}
                        onChange={(e) => setReceiptChargePercent(e.target.value)}
                        placeholder="0"
                        className="h-11 pr-8 text-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-foreground focus:border-emerald-500 font-semibold text-right"
                      />
                      <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm font-bold text-zinc-400 select-none">%</span>
                    </div>
                  </div>
                </div>

                {/* Ledger Preview / Splits Summary (Invoice-Style) */}
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 p-5 space-y-3.5 shadow-sm">
                  <div className="flex justify-between items-center pb-1 border-b border-zinc-150 dark:border-zinc-800">
                    <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Split ledger summary</Label>
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Including Tax & Service Charges</span>
                  </div>
                  <div className="space-y-2">
                    {getReceiptComputedSplits().map((split) => {
                      const profile = profiles[split.profile_id];
                      const isPayer = split.profile_id === receiptPayerId;
                      return (
                        <div key={split.profile_id} className="flex justify-between items-center text-sm">
                          <span className="text-zinc-700 dark:text-zinc-200 font-bold">
                            {profile?.display_name || 'Unknown'} {isPayer && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 rounded font-black uppercase tracking-wider ml-1.5">(Payer)</span>}
                          </span>
                          <span className="font-extrabold text-zinc-800 dark:text-zinc-200 font-mono text-sm">
                            RM {split.amount.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="border-t border-dashed border-zinc-200 dark:border-zinc-800 pt-3.5 flex justify-between items-center font-extrabold text-sm">
                    <span className="text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Total Bill Amount</span>
                    {(() => {
                      const itemsTotal = scannedReceiptData.items.reduce((sum, item) => sum + item.amount, 0);
                      const taxRate = (parseFloat(receiptTaxPercent) || 0) / 100;
                      const chargeRate = (parseFloat(receiptChargePercent) || 0) / 100;
                      const finalTotal = itemsTotal * (1 + taxRate + chargeRate);
                      return <span className="text-lg text-emerald-600 dark:text-emerald-400 font-black font-mono">RM {finalTotal.toFixed(2)}</span>;
                    })()}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6 border-t border-zinc-100 dark:border-zinc-800/80 pt-4 flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setReceiptSplitterOpen(false)}
                className="text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl px-4 py-2 font-semibold text-sm transition-all duration-200"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={(() => {
                  // Disable if any item has 0 members assigned
                  const hasZeroMembers = scannedReceiptData.items.some((item, itemIdx) => {
                    const assigned = receiptItemAssignments[itemIdx] || [];
                    return assigned.length === 0;
                  });
                  if (hasZeroMembers) return true;

                  // Disable if any item split is over total when all members are explicitly set
                  const hasDiscrepancy = scannedReceiptData.items.some((item, itemIdx) => {
                    const assigned = receiptItemAssignments[itemIdx] || [];
                    const customRecord = receiptItemCustomAmounts[itemIdx] || {};
                    const explicitMembers = assigned.filter(mid => customRecord[mid] !== undefined && customRecord[mid] !== '');
                    if (explicitMembers.length === assigned.length) {
                      const itemSplits = getItemSplits(item, itemIdx);
                      const splitsSum = itemSplits.reduce((sum, s) => sum + s.amount, 0);
                      return Math.abs(splitsSum - item.amount) > 0.05;
                    }
                    return false;
                  });
                  return hasDiscrepancy;
                })()}
                onClick={async () => {
                  try {
                    const finalSplits = getReceiptComputedSplits();
                    const itemsTotal = scannedReceiptData.items.reduce((sum, item) => sum + item.amount, 0);
                    const taxRate = (parseFloat(receiptTaxPercent) || 0) / 100;
                    const chargeRate = (parseFloat(receiptChargePercent) || 0) / 100;
                    const totalAmount = itemsTotal * (1 + taxRate + chargeRate);
                    
                    const id = await addExpense(
                      groupId,
                      scannedReceiptData.title || 'AI Scanned Expense',
                      totalAmount,
                      scannedReceiptData.date,
                      receiptPayerId,
                      scannedReceiptData.category,
                      finalSplits,
                      undefined,
                      scannedReceiptBase64 || undefined,
                      scannedReceiptData.items.map((item, itemIdx) => ({
                        name: item.name,
                        amount: item.amount,
                        members: receiptItemAssignments[itemIdx] || []
                      })),
                      'itemized'
                    );

                    if (id) {
                      setNlpSuccess(`Expense "${scannedReceiptData.title}" (RM ${totalAmount.toFixed(2)}) split and logged successfully!`);
                      setReceiptSplitterOpen(false);
                      setScannedReceiptData(null);
                      setScannedReceiptBase64(null);
                      setTimeout(() => setNlpSuccess(null), 5000);
                    } else {
                      setNlpError('Failed to save the splits.');
                    }
                  } catch (err: any) {
                    // console.error(err);
                    setNlpError(err.message || 'Failed to save scanned receipt expense.');
                  }
                }}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 font-semibold shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/20 rounded-xl px-5 py-2.5 text-sm transition-all duration-200 scale-100 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                Log Split Expense
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 1. Leave Group Confirmation Dialog */}
      {leaveConfirmOpen && (
        <Dialog open={leaveConfirmOpen} onOpenChange={(open) => { setLeaveConfirmOpen(open); if (!open) setActionError(null); }}>
          <DialogContent className="border-zinc-200 dark:border-white/10 bg-background text-foreground max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-rose-500" />
                Leave Group
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground pt-1.5 leading-relaxed">
                Are you sure you want to leave <strong>{group.name}</strong>? You will no longer be able to view expenses, log transactions, or settle balances in this directory.
              </DialogDescription>
            </DialogHeader>
            {actionError && (
              <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 p-3 text-xs font-semibold text-rose-600 dark:text-rose-400">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}
            <DialogFooter className="pt-4 flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => { setLeaveConfirmOpen(false); setActionError(null); }}
                className="text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                disabled={isExecutingAction}
              >
                Cancel
              </Button>
              <Button
                onClick={executeLeaveGroup}
                className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5"
                disabled={isExecutingAction}
              >
                {isExecutingAction ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Leaving...
                  </>
                ) : (
                  'Leave Group'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 2. Delete Group Confirmation Dialog */}
      {deleteConfirmOpen && (
        <Dialog open={deleteConfirmOpen} onOpenChange={(open) => { setDeleteConfirmOpen(open); if (!open) setActionError(null); }}>
          <DialogContent className="border-zinc-200 dark:border-white/10 bg-background text-foreground max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-rose-500" />
                Delete Group
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground pt-1.5 leading-relaxed">
                Are you sure you want to permanently delete <strong>{group.name}</strong>? This action is irreversible and will delete all group history, expenses, and settlements.
              </DialogDescription>
            </DialogHeader>
            {actionError && (
              <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 p-3 text-xs font-semibold text-rose-600 dark:text-rose-400">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}
            <DialogFooter className="pt-4 flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => { setDeleteConfirmOpen(false); setActionError(null); }}
                className="text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                disabled={isExecutingAction}
              >
                Cancel
              </Button>
              <Button
                onClick={executeDeleteGroup}
                className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5"
                disabled={isExecutingAction}
              >
                {isExecutingAction ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Group'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 3. Delete Expense Confirmation Dialog */}
      <Dialog open={expenseToDelete !== null} onOpenChange={(open) => { if (!open) { setExpenseToDelete(null); setActionError(null); } }}>
        <DialogContent className="border-zinc-200 dark:border-white/10 bg-background text-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-rose-500" />
              Delete Expense
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1.5 leading-relaxed">
              Are you sure you want to delete this expense? This will recalculate all member balances in this group.
            </DialogDescription>
          </DialogHeader>
          {actionError && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 p-3 text-xs font-semibold text-rose-600 dark:text-rose-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}
          <DialogFooter className="pt-4 flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => { setExpenseToDelete(null); setActionError(null); }}
              className="text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-950"
              disabled={isExecutingAction}
            >
              Cancel
            </Button>
            <Button
              onClick={executeDeleteExpense}
              className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5"
              disabled={isExecutingAction}
            >
              {isExecutingAction ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Expense'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Settings Dialog (Creator Only) */}
      {groupSettingsOpen && (
        <Dialog open={groupSettingsOpen} onOpenChange={setGroupSettingsOpen}>
          <DialogContent className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 text-foreground p-6 rounded-2xl">
            <DialogHeader className="space-y-1.5">
              <DialogTitle className="flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-zinc-50">
                <Settings className="h-5 w-5 text-emerald-500" />
                Group Settings
              </DialogTitle>
              <DialogDescription className="text-zinc-500 dark:text-zinc-400 text-xs">
                Edit group info and manage members.
              </DialogDescription>
            </DialogHeader>

            {groupSettingsError && (
              <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{groupSettingsError}</span>
              </div>
            )}

            {groupSettingsSuccess && (
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-3 rounded-lg">
                <Sparkles className="h-4 w-4 shrink-0 text-emerald-500" />
                <span>{groupSettingsSuccess}</span>
              </div>
            )}

            <form onSubmit={async (e) => {
              e.preventDefault();
              setGroupSettingsError(null);
              setGroupSettingsSuccess(null);
              if (!editGroupName.trim()) {
                setGroupSettingsError('Group name is required');
                return;
              }
              setIsSavingGroupSettings(true);
              try {
                await updateGroup(groupId, editGroupName.trim(), editGroupDescription.trim());
                setGroupSettingsSuccess('Group details saved successfully!');
                setTimeout(() => {
                  setGroupSettingsSuccess(null);
                  setGroupSettingsOpen(false);
                }, 1500);
              } catch (err: any) {
                setGroupSettingsError(err.message || 'Failed to update group settings');
              } finally {
                setIsSavingGroupSettings(false);
              }
            }} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="editGroupName" className="text-xs font-bold text-zinc-550 uppercase tracking-wider block">Group Name</Label>
                <Input
                  id="editGroupName"
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  placeholder="Group Name"
                  className="h-10 text-xs border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-foreground rounded-lg"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editGroupDesc" className="text-xs font-bold text-zinc-550 uppercase tracking-wider block">Description</Label>
                <Input
                  id="editGroupDesc"
                  value={editGroupDescription}
                  onChange={(e) => setEditGroupDescription(e.target.value)}
                  placeholder="Group Description"
                  className="h-10 text-xs border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-foreground rounded-lg"
                />
              </div>

              {/* Members Management */}
              <div className="space-y-2 pt-2">
                <Label className="text-xs font-bold text-zinc-550 uppercase tracking-wider block">Group Members</Label>
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {memberProfiles.map((member) => {
                    const isCreator = member.id === group.created_by;
                    return (
                      <div key={member.id} className="flex items-center justify-between gap-3 p-2 rounded-xl border border-zinc-150 dark:border-zinc-800/40 bg-zinc-50/50 dark:bg-zinc-900/10">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={member.avatar_url} />
                            <AvatarFallback className="bg-zinc-100 dark:bg-zinc-800 text-[10px] text-zinc-650 dark:text-zinc-350">
                              {member.display_name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{member.display_name}</span>
                            <span className="text-[9px] text-zinc-400 dark:text-zinc-650">{member.email}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {isCreator ? (
                            <span className="text-[8px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Creator</span>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={async () => {
                                if (confirm(`Are you sure you want to remove ${member.display_name} from this group?`)) {
                                  try {
                                    await removeMemberFromGroup(groupId, member.id);
                                    setGroupSettingsSuccess(`Successfully removed ${member.display_name}`);
                                    setTimeout(() => setGroupSettingsSuccess(null), 3000);
                                  } catch (err: any) {
                                    setGroupSettingsError(err.message || 'Failed to remove member');
                                  }
                                }
                              }}
                              className="h-8 w-8 text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setGroupSettingsOpen(false)}
                  className="text-xs font-semibold text-zinc-550 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                  disabled={isSavingGroupSettings}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                  disabled={isSavingGroupSettings || !editGroupName.trim()}
                >
                  {isSavingGroupSettings ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Slide-over Expense Detail Drawer */}
      {selectedDetailExpense && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop blur */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-fadeIn" 
            onClick={() => setSelectedDetailExpense(null)} 
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            {/* Sliding Panel */}
            <div className="w-screen max-w-md bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col justify-between animate-slideIn">
              {/* Header */}
              <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 shrink-0 rounded-xl border flex items-center justify-center ${getCategoryBadgeColor(selectedDetailExpense.category)}`}>
                    {getCategoryIcon(selectedDetailExpense.category)}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg text-zinc-900 dark:text-zinc-50 truncate max-w-[200px]">
                      {selectedDetailExpense.description}
                    </h3>
                    <p className="text-[10px] text-zinc-450 dark:text-zinc-500 uppercase tracking-widest font-bold mt-0.5">
                      {selectedDetailExpense.category} • {selectedDetailExpense.date}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setSelectedDetailExpense(null)}
                  className="h-9 w-9 text-zinc-400 hover:text-zinc-650 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
                {/* Financial Summary */}
                <div className="bg-zinc-50/50 dark:bg-zinc-900/20 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 text-center space-y-2">
                  <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest block">Total Spent</span>
                  <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    RM {selectedDetailExpense.amount.toFixed(2)}
                  </span>
                  <p className="text-xs text-zinc-500 dark:text-zinc-450">
                    Paid by <span className="font-bold text-zinc-800 dark:text-zinc-200">
                      {profiles[selectedDetailExpense.paid_by_id]?.display_name || 'Someone'}
                    </span>
                  </p>
                </div>

                {/* Splitting Ledger list */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-450 uppercase tracking-wider">Split Shares</h4>
                  <div className="space-y-2.5">
                    {selectedDetailExpense.splits.map((split) => {
                      const member = profiles[split.profile_id];
                      const isPayer = split.profile_id === selectedDetailExpense.paid_by_id;
                      return (
                        <div key={split.profile_id} className="flex items-center justify-between text-sm bg-zinc-50 dark:bg-zinc-900/20 border border-zinc-200/50 dark:border-zinc-800/40 px-4 py-3 rounded-xl">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={member?.avatar_url} />
                              <AvatarFallback className="bg-zinc-100 dark:bg-zinc-800 text-[10px] text-zinc-600">
                                {member?.display_name ? member.display_name.charAt(0).toUpperCase() : 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-semibold text-zinc-800 dark:text-zinc-250">
                              {member?.display_name || 'Unknown'}
                              {isPayer && (
                                <span className="text-[8px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold px-1.5 py-0.5 rounded ml-1.5 uppercase">Payer</span>
                              )}
                            </span>
                          </div>
                          <span className="font-bold font-mono text-zinc-800 dark:text-zinc-200 text-sm">
                            RM {split.amount.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Scanned Receipt items list */}
                {selectedDetailExpense.items && selectedDetailExpense.items.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-450 uppercase tracking-wider">Itemized Splits (AI Scan)</h4>
                    <div className="space-y-3">
                      {selectedDetailExpense.items.map((item, idx) => (
                        <div key={idx} className="bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border border-zinc-200/60 dark:border-zinc-800 p-4 space-y-3">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-zinc-800 dark:text-zinc-100">{item.name}</span>
                            <span className="font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                              RM {item.amount.toFixed(2)}
                            </span>
                          </div>
                          {/* Members splitting this item */}
                          <div className="flex items-center gap-1.5 pt-1">
                            <span className="text-[9px] text-zinc-400 uppercase font-semibold mr-1">Split with:</span>
                            <div className="flex -space-x-1 overflow-hidden">
                              {item.members.map((mid) => (
                                <Avatar key={mid} className="h-5 w-5 ring-1 ring-white dark:ring-zinc-900" title={profiles[mid]?.display_name}>
                                  <AvatarImage src={profiles[mid]?.avatar_url} />
                                  <AvatarFallback className="bg-zinc-250 text-[8px] text-zinc-700">
                                    {profiles[mid]?.display_name ? profiles[mid].display_name.charAt(0).toUpperCase() : 'U'}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                            </div>
                            <span className="text-[9px] text-zinc-400 font-medium ml-1">
                              ({item.members.length} member(s) • RM {(item.amount / Math.max(1, item.members.length)).toFixed(2)} each)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Receipt Image Attachment */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-450 uppercase tracking-wider">Receipt Attachment</h4>
                  {selectedDetailExpense.receipt_url ? (
                    <div className="relative group overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/10 p-2 shadow-sm cursor-zoom-in" onClick={() => setIsImageLightboxOpen(true)}>
                      <img 
                        src={selectedDetailExpense.receipt_url} 
                        alt="Receipt Scan" 
                        className="w-full max-h-56 object-contain rounded-xl bg-zinc-900 transition duration-300 group-hover:scale-[1.01]"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1 rounded-xl">
                        🔍 Click to Zoom / View Full
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 p-8 text-center rounded-2xl space-y-3">
                      <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 text-zinc-400">
                        <Upload className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">No Receipt Attached</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">Attach an image file to keep records for everyone.</p>
                      </div>
                      {/* Retrospective upload button */}
                      {/* Retrospective upload button */}
                      <label 
                        onClick={(e) => {
                          const isPayer = selectedDetailExpense.paid_by_id === currentUser.id;
                          const isCreator = selectedDetailExpense.created_by === currentUser.id;
                          if (!isPayer && !isCreator) {
                            e.preventDefault();
                            setPermissionWarningMessage("Only the payer or creator of this expense is allowed to attach a receipt.");
                            setPermissionWarningOpen(true);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold transition duration-200 cursor-pointer shadow-sm"
                      >
                        Attach Image
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = async () => {
                              const base64 = reader.result as string;
                              try {
                                await updateExpense(
                                  selectedDetailExpense.id,
                                  selectedDetailExpense.description,
                                  selectedDetailExpense.amount,
                                  selectedDetailExpense.date,
                                  selectedDetailExpense.paid_by_id,
                                  selectedDetailExpense.category,
                                  selectedDetailExpense.splits,
                                  base64,
                                  selectedDetailExpense.items,
                                  selectedDetailExpense.splitType
                                );
                                // Update view state
                                setSelectedDetailExpense({
                                  ...selectedDetailExpense,
                                  receipt_url: base64
                                });
                              } catch (err: any) {
                                alert('Failed to attach receipt: ' + err.message);
                              }
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Actions footer */}
              <div className="px-6 py-5 border-t border-zinc-200 dark:border-zinc-800 flex gap-3">
                <Button 
                  onClick={() => {
                    const isPayer = selectedDetailExpense.paid_by_id === currentUser.id;
                    const isCreator = selectedDetailExpense.created_by === currentUser.id;
                    if (!isPayer && !isCreator) {
                      setPermissionWarningMessage("Only the payer or creator of this expense is allowed to edit its details.");
                      setPermissionWarningOpen(true);
                      return;
                    }
                    handleEditExpenseClick(selectedDetailExpense);
                    setSelectedDetailExpense(null);
                  }}
                  className="flex-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold border border-zinc-200/50 dark:border-zinc-800 rounded-xl h-11"
                >
                  Edit Details
                </Button>
                <Button 
                  onClick={() => {
                    const isPayer = selectedDetailExpense.paid_by_id === currentUser.id;
                    const isCreator = selectedDetailExpense.created_by === currentUser.id;
                    if (!isPayer && !isCreator) {
                      setPermissionWarningMessage("Only the payer or creator of this expense is allowed to delete it.");
                      setPermissionWarningOpen(true);
                      return;
                    }
                    setExpenseToDelete(selectedDetailExpense.id);
                    setSelectedDetailExpense(null);
                  }}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl h-11 shadow-md shadow-rose-600/10"
                >
                  Delete Expense
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Image Full-screen Lightbox */}
      {isImageLightboxOpen && selectedDetailExpense && selectedDetailExpense.receipt_url && (
        <Dialog open={isImageLightboxOpen} onOpenChange={setIsImageLightboxOpen}>
          <DialogContent className="max-w-3xl border-zinc-200 dark:border-zinc-800 bg-black/95 text-white p-2 overflow-hidden flex flex-col items-center justify-center h-[90vh]">
            <DialogHeader className="w-full flex flex-row items-center justify-between px-4 py-2 text-zinc-400">
              <DialogTitle className="text-sm font-semibold text-white truncate max-w-[200px]">
                Receipt: {selectedDetailExpense.description}
              </DialogTitle>
              <DialogDescription className="hidden" />
            </DialogHeader>
            
            <div className="flex-1 w-full overflow-hidden flex items-center justify-center p-4 relative bg-zinc-950 rounded-xl select-none">
              {/* Overlay controls */}
              <div className="absolute top-4 right-4 z-10 flex gap-2 bg-black/60 backdrop-blur-md border border-zinc-800 p-1.5 rounded-xl">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => setZoomScale(prev => Math.min(prev + 0.25, 4))} 
                  className="h-8 w-8 text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg border-0"
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => {
                    setZoomScale(prev => {
                      const next = Math.max(prev - 0.25, 1);
                      if (next === 1) setPanOffset({ x: 0, y: 0 });
                      return next;
                    });
                  }} 
                  className="h-8 w-8 text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg border-0"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => {
                    setZoomScale(1);
                    setPanOffset({ x: 0, y: 0 });
                  }} 
                  className="h-8 w-8 text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg border-0"
                  title="Reset Zoom"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>

              {/* Drag instruction helper text */}
              {zoomScale > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-black/65 backdrop-blur-md px-3 py-1 rounded-full text-[10px] text-zinc-400 font-bold border border-zinc-800 tracking-wider">
                  ↕️ Drag to Pan Receipt
                </div>
              )}

              {/* Interactive image container */}
              <div 
                className="w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
                onMouseDown={(e) => {
                  if (zoomScale <= 1) return;
                  setIsDragging(true);
                  setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
                }}
                onMouseMove={(e) => {
                  if (!isDragging) return;
                  setPanOffset({
                    x: e.clientX - dragStart.x,
                    y: e.clientY - dragStart.y
                  });
                }}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => setIsDragging(false)}
              >
                <img 
                  src={selectedDetailExpense.receipt_url} 
                  alt="Receipt Full Preview" 
                  draggable={false}
                  className="max-w-full max-h-full object-contain rounded-xl select-none transition-transform duration-75 ease-out"
                  style={{
                    transform: `scale(${zoomScale}) translate(${panOffset.x / zoomScale}px, ${panOffset.y / zoomScale}px)`
                  }}
                />
              </div>
            </div>

            <DialogFooter className="w-full flex justify-end p-2 border-t border-zinc-800">
              <Button onClick={() => setIsImageLightboxOpen(false)} className="bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl">
                Close View
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Action Warning Dialog */}
      {permissionWarningOpen && (
        <Dialog open={permissionWarningOpen} onOpenChange={setPermissionWarningOpen}>
          <DialogContent className="w-full sm:max-w-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-foreground p-6 rounded-2xl shadow-2xl">
            <DialogHeader className="flex flex-col items-center text-center space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
                <AlertCircle className="h-6 w-6" />
              </div>
              <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Action Restricted
              </DialogTitle>
              <DialogDescription className="text-zinc-500 dark:text-zinc-400 text-sm">
                {permissionWarningMessage}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="pt-4 flex justify-center sm:justify-center">
              <Button 
                onClick={() => setPermissionWarningOpen(false)} 
                className="w-full sm:w-auto px-8 bg-zinc-900 hover:bg-zinc-805 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-bold rounded-xl h-10 shadow-md shadow-zinc-950/10 border-0"
              >
                Got It
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {/* Hidden Mobile Camera Input (for scanning on mobile screens) */}
      <input
        id="mobile-camera-capture"
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleAIReceiptUpload}
      />
      {/* Laptop Camera Scanner Dialog */}
      {companionDialogOpen && (
        <Dialog open={companionDialogOpen} onOpenChange={(open) => { if (!open) handleCloseCompanionDialog(); }}>
          <DialogContent className="w-full sm:max-w-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-foreground p-6 rounded-2xl shadow-2xl">
            <DialogHeader className="flex flex-col items-center text-center space-y-1.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 animate-pulse">
                <Video className="h-5 w-5 animate-pulse" />
              </div>
              <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Laptop Camera Receipt Scanner
              </DialogTitle>
              <DialogDescription className="text-zinc-500 dark:text-zinc-400 text-xs">
                Align your receipt inside the target box and click capture.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center justify-center py-2 space-y-3">
              {webcamCapturedImage ? (
                /* Captured Preview Screen */
                <div className="space-y-4 w-full animate-scaleUp">
                  <div className="relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-950 aspect-[4/3] flex items-center justify-center">
                    <img 
                      src={webcamCapturedImage} 
                      alt="Captured receipt preview" 
                      className={`max-h-full max-w-full object-contain animate-fadeIn ${isSubmittingWebcam ? 'opacity-50' : ''}`}
                    />
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[9px] text-white font-bold border border-white/10 tracking-wider">
                      Photo Captured
                    </div>
                    {isSubmittingWebcam && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 backdrop-blur-sm">
                        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                        <span className="text-xs text-emerald-300 font-bold uppercase tracking-wider animate-pulse">AI Scanning Receipt...</span>
                      </div>
                    )}
                  </div>

                  {/* Scan error - shown inside dialog so user can retry */}
                  {webcamScanError && !isSubmittingWebcam && (
                    <div className="flex items-start gap-3 p-3.5 rounded-xl border border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-400 animate-fadeIn">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold">No receipt detected</p>
                        <p className="text-xs font-medium mt-0.5 opacity-80">{webcamScanError}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setWebcamCapturedImage(null);
                        setWebcamScanError(null);
                        // Restart stream in case the video element was unmounted
                        if (!webcamStream) {
                          startWebcam();
                        }
                      }}
                      className="flex-1 text-xs font-bold border-zinc-200 dark:border-zinc-800 h-10 rounded-xl"
                      disabled={isSubmittingWebcam}
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5 inline" />
                      {webcamScanError ? 'Try Again' : 'Retake Photo'}
                    </Button>
                    <Button
                      type="button"
                      onClick={submitWebcamImage}
                      disabled={isSubmittingWebcam}
                      className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold h-10 rounded-xl shadow-lg shadow-emerald-600/10 disabled:opacity-60"
                    >
                      {isSubmittingWebcam ? (
                        <><Loader2 className="h-3.5 w-3.5 mr-1.5 inline animate-spin" />Scanning...</>
                      ) : (
                        <><Sparkles className="h-3.5 w-3.5 mr-1.5 inline" />Scan with AI</>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                /* Live Camera Capture Screen */
                <div className="space-y-4 w-full">
                  <div className="relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-950 aspect-[4/3] flex items-center justify-center shadow-inner">
                    {/* Visual Flash Overlay */}
                    {isFlashing && (
                      <div className="absolute inset-0 bg-white z-20 animate-flashOut" />
                    )}

                    {webcamError ? (
                      <div className="p-6 text-center space-y-2.5 max-w-xs">
                        <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
                        <p className="text-xs font-semibold text-rose-600 dark:text-rose-450 leading-relaxed">
                          {webcamError}
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={startWebcam}
                          className="text-xs font-semibold"
                        >
                          Try Again
                        </Button>
                      </div>
                    ) : webcamStream ? (
                      <>
                        <video 
                          ref={videoRef}
                          autoPlay 
                          playsInline 
                          muted
                          className="w-full h-full object-cover rounded-xl"
                        />

                        {/* Scanner Viewport Overlay */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
                          <div className="w-[50%] h-[98%] border-2 border-dashed border-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.2)] rounded-xl relative overflow-hidden bg-emerald-500/5">
                            {/* Sweeping Laser Line inside the viewport */}
                            <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-laserSweep" />
                          </div>
                        </div>

                        {/* Pulsing Countdown floating badge */}
                        {countdown !== null && (
                          <div className="absolute top-4 right-4 h-12 w-12 bg-emerald-600 border border-emerald-400/30 text-white font-black text-2xl rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/20 z-10 animate-pulse font-mono">
                            {countdown}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2 py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider animate-pulse">
                          Connecting Camera...
                        </span>
                      </div>
                    )}
                  </div>

                  {webcamStream && !webcamError && (
                    <div className="w-full space-y-3">
                      <div className="flex justify-center items-center text-xs font-bold text-zinc-500 dark:text-zinc-400 py-1">
                        <span>Align the receipt inside the green portrait box</span>
                      </div>

                      {/* Manual Capture Trigger Buttons */}
                      <div className="flex justify-center">
                        {countdown !== null ? (
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={() => {
                              if (countdownIntervalRef.current) {
                                clearInterval(countdownIntervalRef.current);
                                countdownIntervalRef.current = null;
                              }
                              setCountdown(null);
                            }}
                            className="w-full font-bold h-10 rounded-xl"
                          >
                            Cancel Timer
                          </Button>
                        ) : (
                          <div className="flex gap-3 w-full">
                            <Button
                              type="button"
                              onClick={() => {
                                setIsFlashing(true);
                                setTimeout(() => setIsFlashing(false), 150);
                                capturePhoto();
                              }}
                              className="flex-1 bg-zinc-150 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-foreground font-bold h-10 rounded-xl"
                            >
                              Snap Now
                            </Button>
                            <Button
                              type="button"
                              onClick={startTimerCapture}
                              className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold h-10 rounded-xl shadow-lg shadow-emerald-600/10"
                            >
                              5s Timer
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 border-t border-zinc-150 dark:border-zinc-800/60 mt-2">
              <Button 
                type="button"
                variant="ghost" 
                onClick={handleCloseCompanionDialog} 
                className="w-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl text-xs font-semibold border-0"
              >
                Close Scanner
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Zoom Qr Lightbox Modal */}
      {zoomedQrUrl && (
        <Dialog open={!!zoomedQrUrl} onOpenChange={(open) => { if (!open) setZoomedQrUrl(null); }}>
          <DialogContent className="max-w-xs border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 p-5 rounded-2xl text-center shadow-2xl">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-xs font-bold flex items-center justify-center gap-1.5 text-zinc-900 dark:text-white">
                <QrCode className="h-4.5 w-4.5 text-pink-500" />
                {zoomedQrName}'s {zoomedQrLabel || 'QR Code'}
              </DialogTitle>
            </DialogHeader>
            <div className="relative mx-auto my-3 flex h-60 w-60 items-center justify-center bg-white border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 shadow-inner">
              <img
                src={zoomedQrUrl}
                alt="Zoomed Payment QR"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <DialogFooter className="flex sm:justify-center gap-2 mt-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setZoomedQrUrl(null)}
                className="text-xs font-semibold rounded-xl"
              >
                Close
              </Button>
              <a
                href={zoomedQrUrl}
                download={`${zoomedQrName}-qr-code.jpg`}
                className="inline-flex h-9 items-center justify-center rounded-xl bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 text-xs font-bold shadow transition cursor-pointer"
              >
                Download QR
              </a>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-slideIn {
          animation: slideIn 250ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes laserSweep {
          0% { top: 0%; opacity: 0.3; }
          50% { top: 100%; opacity: 0.8; }
          100% { top: 0%; opacity: 0.3; }
        }
        .animate-laserSweep {
          animation: laserSweep 2s ease-in-out infinite;
        }
        @keyframes flashOut {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        .animate-flashOut {
          animation: flashOut 400ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />
    </div>
  );
}
