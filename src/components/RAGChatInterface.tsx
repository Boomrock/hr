import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  Brain,
  Send,
  Bot,
  User,
  MessageSquare,
  Zap,
  Target,
  Clock,
  History,
  Download
} from 'lucide-react';
import RAGService, { ChatMessage, CandidateProfile, KnowledgeItem } from '../services/ragService';
import { chatService, ChatService } from '../services/chatService';
import type { AppUser, MessageType } from '@/types/profile';
import ChatInput from './ChatInput';

interface RAGChatInterfaceProps {
  user: AppUser;
  onBack: () => void;
}

export function RAGChatInterface({ user, onBack }: RAGChatInterfaceProps) {
  const [ragService] = useState(() => new RAGService());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<CandidateProfile | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Автопрокрутка к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Автоматический старт сессии
  useEffect(() => {
    initializeSession();
  }, []);

  // Загрузка истории чатов
  useEffect(() => {
    loadChatHistory();
  }, [user]);

  const initializeSession = async () => {
    try {
      // Попытка восстановить активную сессию
      const restoredSession = await chatService.restoreSessionFromStorage(user);
      
      if (restoredSession) {
        setCurrentSessionId(restoredSession.id);
        // Загружаем сообщения из базы данных
        const savedMessages = await chatService.getSessionMessages(restoredSession.id);
        setMessages(savedMessages);
        setMessageCount(savedMessages.filter(m => m.role === 'user').length);
        setSessionStarted(true);
        
        // Загружаем профиль если есть
        const profile = await chatService.getCandidateProfile(restoredSession.id);
        if (profile) {
          setCurrentProfile(profile);
        }
      } else {
        // Создаем новую сессию
        await startNewSession();
      }
    } catch (error) {
      console.error('Session initialization error:', error);
      await startNewSession();
    }
  };

  const startNewSession = async () => {
    setSessionStarted(true);
    setIsLoading(true);

    try {
      // Создаем новую сессию в базе данных
      const session = await chatService.createChatSession({
        user,
        sessionType: 'rag-chat',
        metadata: { difficulty: 'middle' }
      });

      setCurrentSessionId(session.id);
      chatService.saveSessionToStorage(user, session.id);

      const welcomeMessage = await ragService.conductInterview(
        `Привет! Меня зовут ${user.name}, готов к собеседованию.`,
        'middle'
      );

      // Добавляем приветственное сообщение в базу данных
      const dbMessage = await chatService.addMessage(session.id, {
        role: 'assistant',
        content: welcomeMessage,
        messageType: 'text'
      });

      setMessages([dbMessage]);
    } catch (error) {
      console.error('Session start error:', error);
      
      const fallbackMessage = `Добро пожаловать в AI собеседование с RAG, ${user.name}! 🤖

Я использую передовую технологию RAG (Retrieval Augmented Generation) для проведения интеллектуальных собеседований. 

Расскажите немного о себе: ваш опыт работы, навыки и что вас интересует в профессиональном развитии?`;

      if (currentSessionId) {
        const dbMessage = await chatService.addMessage(currentSessionId, {
          role: 'assistant',
          content: fallbackMessage,
          messageType: 'text'
        });
        setMessages([dbMessage]);
      } else {
        setMessages([{
          id: 'temp-1',
          sessionId: 'temp',
          role: 'assistant',
          content: fallbackMessage,
          timestamp: Date.now()
        }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadChatHistory = async () => {
    try {
      const history = await chatService.getUserChatHistory(user.email, 10);
      setChatHistory(history);
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const sendMessage = async (message?: string, type: MessageType = 'text', voiceData?: any) => {
    const messageText = message || inputMessage;
    if (!messageText.trim() || isLoading || !currentSessionId) return;

    setIsLoading(true);
    if (!message) {
      setInputMessage('');
    }

    try {
      // Сохраняем сообщение пользователя в базу данных
      const userMessage = await chatService.addMessage(currentSessionId, {
        role: 'user',
        content: messageText,
        messageType: type,
        confidence: voiceData?.confidence,
        metadata: voiceData ? {
          audioBlob: voiceData.audioBlob,
          duration: voiceData.duration,
          ...voiceData
        } : undefined
      });

      setMessages(prev => [...prev, userMessage]);
      setMessageCount(prev => prev + 1);

      // Получаем ответ от RAG
      const response = await ragService.conductInterview(messageText, 'middle');
      
      // Сохраняем ответ ассистента в базу данных
      const assistantMessage = await chatService.addMessage(currentSessionId, {
        role: 'assistant',
        content: response,
        messageType: 'text'
      });

      setMessages(prev => [...prev, assistantMessage]);
      
      // Автоматическая оценка ответа
      await ragService.autoEvaluateLastResponse();
      
      // Обновляем профиль
      const updatedProfile = ragService.getCurrentProfile();
      if (updatedProfile) {
        // Сохраняем профиль в базу данных
        const savedProfile = await chatService.saveCandidateProfile(currentSessionId, {
          overallScore: updatedProfile.overallScore,
          technicalSkills: JSON.stringify(updatedProfile.technicalSkills),
          softSkills: JSON.stringify(updatedProfile.softSkills),
          summary: updatedProfile.summary,
          recommendations: JSON.stringify(updatedProfile.recommendations),
          strengths: JSON.stringify(updatedProfile.strengths),
          weaknesses: JSON.stringify(updatedProfile.weaknesses),
          aiAnalysis: JSON.stringify(updatedProfile.aiAnalysis || {}),
          individualDevelopmentPlan: JSON.stringify(updatedProfile.individualDevelopmentPlan || {})
        });
        setCurrentProfile(savedProfile);
      }

    } catch (error) {
      console.error('Send message error:', error);
      
      // Сохраняем сообщение об ошибке
      const errorMessage = await chatService.addMessage(currentSessionId, {
        role: 'assistant',
        content: 'Извините, произошла ошибка при обработке вашего ответа. Давайте продолжим - расскажите мне больше о вашем опыте работы.',
        messageType: 'text'
      });
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const generateFinalProfile = async () => {
    if (messageCount < 3) {
      alert('Пожалуйста, ответьте еще на несколько вопросов для создания полного профиля.');
      return;
    }

    if (!currentSessionId) return;

    setIsLoading(true);
    try {
      const finalProfile = await ragService.generateFinalProfile();
      
      // Сохраняем финальный профиль в базу данных
      const savedProfile = await chatService.saveCandidateProfile(currentSessionId, {
        overallScore: finalProfile.overallScore,
        technicalSkills: JSON.stringify(finalProfile.technicalSkills),
        softSkills: JSON.stringify(finalProfile.softSkills),
        summary: finalProfile.summary,
        recommendations: JSON.stringify(finalProfile.recommendations),
        strengths: JSON.stringify(finalProfile.strengths),
        weaknesses: JSON.stringify(finalProfile.weaknesses),
        aiAnalysis: JSON.stringify(finalProfile.aiAnalysis || {}),
        individualDevelopmentPlan: JSON.stringify(finalProfile.individualDevelopmentPlan || {})
      });
      
      setCurrentProfile(savedProfile);

      // Обновляем оценки компетенций на основе финального анализа
      updateCompetencyRatingsFromFinalProfile(finalProfile);

      const completionMessage = `Спасибо за интересную беседу! 🎉

Ваш профиль кандидата готов. Основные результаты:
• Общий балл: ${finalProfile.overallScore}/100
• Технических навыков оценено: ${Object.keys(finalProfile.technicalSkills).length}
• Soft skills оценено: ${Object.keys(finalProfile.softSkills).length}

${finalProfile.summary}

Рекомендации для развития:
${finalProfile.recommendations.slice(0, 3).map(rec => `• ${rec}`).join('\n')}`;

      // Сохраняем сообщение о завершении
      const dbMessage = await chatService.addMessage(currentSessionId, {
        role: 'assistant',
        content: completionMessage,
        messageType: 'text'
      });
      
      setMessages(prev => [...prev, dbMessage]);
      
      // Завершаем сессию
      await chatService.endSession(currentSessionId);
      chatService.removeSessionFromStorage(user);
      
    } catch (error) {
      console.error('Profile generation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportChatData = async () => {
    if (!currentSessionId) return;
    
    try {
      const chatData = await chatService.exportChatData(currentSessionId);
      const dataStr = JSON.stringify(chatData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `chat-session-${currentSessionId}-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Ошибка при экспорте данных');
    }
  };

  const loadHistorySession = async (sessionId: string) => {
    try {
      const session = await chatService.loadSession(sessionId);
      if (session) {
        setCurrentSessionId(sessionId);
        const messages = await chatService.getSessionMessages(sessionId);
        setMessages(messages);
        setMessageCount(messages.filter(m => m.role === 'user').length);
        
        const profile = await chatService.getCandidateProfile(sessionId);
        setCurrentProfile(profile);
        
        setShowHistory(false);
        chatService.saveSessionToStorage(user, sessionId);
      }
    } catch (error) {
      console.error('Failed to load history session:', error);
    }
  };

  const startNewChat = async () => {
    // Завершаем текущую сессию если есть
    if (currentSessionId) {
      await chatService.endSession(currentSessionId);
      chatService.removeSessionFromStorage(user);
    }
    
    // Сброс состояния
    setMessages([]);
    setCurrentProfile(null);
    setMessageCount(0);
    setCurrentSessionId(null);
    setSessionStarted(false);
    
    // Запуск новой сессии
    await startNewSession();
    await loadChatHistory(); // Обновляем историю
  };

  // Функция обновления оценок компетенций на основе финального профиля
  const updateCompetencyRatingsFromFinalProfile = (finalProfile: any) => {
    try {
      // Получаем текущие оценки компетенций
      const currentRatings = JSON.parse(localStorage.getItem(`competency-data-${user.email}`) || '[]');

      // Анализируем финальный профиль и поведение
      const summary = finalProfile.summary || '';
      const overallScore = finalProfile.overallScore || 0;

      // Анализ поведения из финального профиля
      const hasBehavioralIssues = /груб|агрессив|неуважитель|отказ|негатив|проблем|серьезный минус|не подходит|крайне низкий|непрофессиональ/i.test(summary);
      const isUnmotivated = /немотивирован|односложн|уклончив|отсутствие интереса|нежелание/i.test(summary);
      const hasPoorCommunication = /коммуник|уважен|профессионализм|поведен|агрессивное поведение|отказ от сотрудничества/i.test(summary);

      // Обновляем оценки на основе анализа финального профиля

      // Низкий общий балл = снижение всех компетенций
      if (overallScore < 30) {
        updateRating(currentRatings, 'communication', -1.0);
        updateRating(currentRatings, 'leadership', -1.0);
        updateRating(currentRatings, 'productivity', -1.0);
        updateRating(currentRatings, 'reliability', -1.0);
        updateRating(currentRatings, 'initiative', -1.0);
      } else if (overallScore < 50) {
        updateRating(currentRatings, 'communication', -0.5);
        updateRating(currentRatings, 'leadership', -0.5);
        updateRating(currentRatings, 'productivity', -0.5);
        updateRating(currentRatings, 'reliability', -0.5);
        updateRating(currentRatings, 'initiative', -0.5);
      }

      // Проблемы с поведением = снижение коммуникации и лидерства
      if (hasBehavioralIssues) {
        updateRating(currentRatings, 'communication', -0.8);
        updateRating(currentRatings, 'leadership', -0.8);
        updateRating(currentRatings, 'reliability', -0.6);
      }

      // Немотивация = снижение инициативности
      if (isUnmotivated) {
        updateRating(currentRatings, 'initiative', -0.7);
        updateRating(currentRatings, 'productivity', -0.5);
      }

      // Проблемы с коммуникацией
      if (hasPoorCommunication) {
        updateRating(currentRatings, 'communication', -0.6);
      }

      // Сохраняем обновленные оценки
      localStorage.setItem(`competency-data-${user.email}`, JSON.stringify(currentRatings));

      console.log('Оценки компетенций обновлены на основе финального профиля:', currentRatings);
    } catch (error) {
      console.error('Ошибка при обновлении оценок компетенций из финального профиля:', error);
    }
  };

  // Вспомогательная функция для обновления оценки компетенции
  const updateRating = (ratings: any[], competencyId: string, increment: number) => {
    const ratingIndex = ratings.findIndex(r => r.competencyId === competencyId);

    if (ratingIndex >= 0) {
      // Обновляем существующую оценку
      const currentValue = ratings[ratingIndex].currentValue;
      const newValue = Math.min(5, Math.max(0, currentValue + increment));
      ratings[ratingIndex].currentValue = newValue;
      ratings[ratingIndex].lastAssessed = new Date().toISOString();

      // Обновляем целевое значение на основе текущего
      ratings[ratingIndex].targetValue = Math.min(5, newValue + 1);
    } else {
      // Создаем новую оценку
      const startValue = Math.max(1, Math.min(5, 3.0 + increment));
      ratings.push({
        competencyId,
        currentValue: startValue,
        targetValue: Math.min(5, startValue + 1),
        category: getCompetencyCategory(competencyId),
        lastAssessed: new Date().toISOString(),
        improvementPlan: []
      });
    }
  };

  // Вспомогательная функция для определения категории компетенции
  const getCompetencyCategory = (competencyId: string): string => {
    const categories: Record<string, string> = {
      communication: 'soft',
      leadership: 'leadership',
      productivity: 'business',
      reliability: 'soft',
      initiative: 'soft'
    };
    return categories[competencyId] || 'soft';
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Заголовок */}
        <div className="flex items-center justify-between bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-4 md:p-8 shadow-2xl">
          <div className="flex items-center gap-3">
            <Button onClick={onBack} variant="outline" size="sm" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">AI Собеседование с RAG</h1>
              <p className="text-gray-400 text-sm">Интеллектуальное собеседование на основе базы знаний</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge className="bg-emerald-600 text-white">
              <Brain className="h-4 w-4 mr-1" />
              RAG Powered
            </Badge>
            <Badge className="bg-blue-600 text-white">
              <MessageSquare className="h-4 w-4 mr-1" />
              {messageCount} ответов
            </Badge>
            <Button 
              onClick={() => setShowHistory(!showHistory)} 
              variant="outline" 
              size="sm" 
              className="bg-white/5 border-white/10 text-white hover:bg-white/10"
            >
              <History className="h-4 w-4 mr-1" />
              История
            </Button>
            {currentSessionId && (
              <Button 
                onClick={exportChatData} 
                variant="outline" 
                size="sm" 
                className="bg-white/5 border-white/10 text-white hover:bg-white/10"
              >
                <Download className="h-4 w-4 mr-1" />
                Экспорт
              </Button>
            )}
          </div>
        </div>

        {/* История чатов */}
        {showHistory && (
          <Card className="bg-white/5 border-white/10 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                История чатов
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chatHistory.length === 0 ? (
                <p className="text-gray-400">Нет сохраненных чатов</p>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {chatHistory.map((history) => (
                    <div 
                      key={history.session.id}
                      className="p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors"
                      onClick={() => loadHistorySession(history.session.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{history.session.sessionType}</div>
                          <div className="text-sm text-gray-400">
                            {new Date(history.session.startTime).toLocaleString('ru')}
                          </div>
                          <div className="text-xs text-gray-500">
                            {history.messages.length} сообщений
                            {history.profile && ` • Балл: ${history.profile.overallScore}/100`}
                          </div>
                        </div>
                        <Badge 
                          className={history.session.status === 'completed' ? 'bg-green-600' : 'bg-yellow-600'}
                        >
                          {history.session.status === 'completed' ? 'Завершен' : 'Активный'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-white/10">
                <Button 
                  onClick={startNewChat}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  Начать новый чат
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Основной чат */}
          <div className="lg:col-span-3">
            <Card className="bg-white/5 border-white/10 text-white h-[600px] flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-emerald-400" />
                  RAG HR Assistant
                </CardTitle>
                <div className="text-sm text-gray-400">
                  Используется технология RAG для интеллектуального подбора вопросов
                </div>
              </CardHeader>

              <CardContent className="flex-1 overflow-y-auto space-y-4 p-4">
                {messages.map((message, index) => (
                  <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-4 rounded-xl ${
                      message.role === 'user'
                        ? 'bg-emerald-600 text-white ml-4'
                        : 'bg-white/10 text-white mr-4'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {message.role === 'assistant' ? (
                          <Bot className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <User className="h-4 w-4 text-blue-400" />
                        )}
                        <span className="text-sm font-medium">
                          {message.role === 'assistant' ? 'RAG Assistant' : user.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="whitespace-pre-wrap leading-relaxed">
                        {message.content}
                      </div>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white/10 text-white p-4 rounded-xl mr-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Bot className="h-4 w-4 text-emerald-400" />
                        <span className="text-sm font-medium">RAG Assistant</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </CardContent>

              {/* Ввод сообщения */}
              <div className="p-4 border-t border-white/10">
                <div className="space-y-3">
                  <ChatInput
                    onSendMessage={sendMessage}
                    isLoading={isLoading}
                  />

                  {messageCount >= 3 && (
                    <Button
                      onClick={generateFinalProfile}
                      disabled={isLoading}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <Target className="h-4 w-4 mr-2" />
                      Завершить собеседование и создать профиль
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Панель статистики */}
          <div className="space-y-6">
            {/* Прогресс собеседования */}
            <Card className="bg-white/5 border-white/10 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Прогресс
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Ответов дано</span>
                    <span className="font-medium">{messageCount}</span>
                  </div>
                  <Progress value={Math.min((messageCount / 8) * 100, 100)} className="h-2" />
                  <div className="text-xs text-gray-400">
                    Рекомендуется 5-8 ответов для полного профиля
                  </div>
                </div>

                {currentProfile && (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Общий балл</span>
                        <span className="font-medium">{currentProfile.overallScore}/100</span>
                      </div>
                      <Progress value={currentProfile.overallScore} className="h-2" />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Время сессии</span>
                        <span className="font-medium">
                          {currentProfile.createdAt
                            ? Math.round((Date.now() - currentProfile.createdAt) / 60000) + ' мин'
                            : '0 мин'
                          }
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Текущие оценки */}
                            {currentProfile && currentProfile.technicalSkills && (
              <Card className="bg-white/5 border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Brain className="h-5 w-5 text-purple-500" />
                    Оценки навыков
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(() => {
                      try {
                        const skills = JSON.parse(currentProfile.technicalSkills);
                        return Object.entries(skills).slice(0, 4).map(([skill, score]) => (
                          <div key={skill} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="truncate">{skill}</span>
                              <span className="font-medium">{score}/100</span>
                            </div>
                            <Progress value={score as number} className="h-1" />
                          </div>
                        ));
                      } catch {
                        return <div className="text-gray-400">Навыки пока не оценены</div>;
                      }
                    })()}
                    
                    {(() => {
                      try {
                        const skills = JSON.parse(currentProfile.technicalSkills);
                        const skillCount = Object.keys(skills).length;
                        return skillCount > 4 && (
                          <div className="text-xs text-gray-400 text-center">
                            +{skillCount - 4} навыков
                          </div>
                        );
                      } catch {
                        return null;
                      }
                    })()}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Подсказки */}
            <Card className="bg-white/5 border-white/10 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5 text-blue-500" />
                  Советы
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-300">
                  <div>• Отвечайте подробно на вопросы</div>
                  <div>• Приводите конкретные примеры</div>
                  <div>• Упоминайте используемые технологии</div>
                  <div>• Рассказывайте о достижениях</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RAGChatInterface;
