import React, { useEffect, useMemo, useState } from "react";
import { Card, Row, Col, Switch, Button, Typography, Space, message, Grid, Table, Empty, Pagination, Statistic, Progress, Badge, Tag, Select } from "antd";
import { ReloadOutlined, PlayCircleOutlined, FireOutlined, TrophyOutlined, GiftOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { getTodayPlan, aggregateDailyStudyAndUpdateProgress } from "@/services/learningService";
import { evaluateRewardsOnEvent, getUserRewards } from "@/services/rewardService";
import { useAppStore } from "@/store/useAppStore";

const { Title, Text } = Typography;

type PerBookQuota = { wordbookId: number; wordbookName?: string; quota: number; dueCount: number; upcomingCount: number };
type PlanItem = { id: string; wordId: number; wordbookId: number; word: string; nextReview: string; retrievability?: number };

export default function TodayPlanPage() {
  const navigate = useNavigate();
  const userId = useAppStore((s) => s.userId);
  const [includeUpcoming, setIncludeUpcoming] = useState<boolean>(false);
  const dailyQuota = useAppStore(s => s.dailyQuota ?? 60); // 从 Store 设置读取，默认 60
  const [loading, setLoading] = useState<boolean>(false);

  const [perBook, setPerBook] = useState<PerBookQuota[]>([]);
  const [streak, setStreak] = useState<number>(0);
  const [rewardHint, setRewardHint] = useState<string | null>(null);
  const [items, setItems] = useState<PlanItem[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);

  // 展示分页（全局 items 列表）
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [wbFilter, setWbFilter] = useState<number | 'all'>('all');

  const isMobile = !Grid.useBreakpoint().md;

  const totalSelected = items.length;
  const progressPct = Math.min(100, Math.round((totalSelected / dailyQuota) * 100));
  const filteredItems = useMemo(() => {
    if (wbFilter === 'all') return items;
    return items.filter(i => i.wordbookId === wbFilter);
  }, [items, wbFilter]);

  const selectedPageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  const generatePlan = async () => {
    setLoading(true);
    try {
      const plan = await getTodayPlan({ userId, dailyQuota, includeUpcoming });
      setPerBook(plan.perWordbookQuota as any);
      setItems(plan.items as any);
      sessionStorage.setItem("todayPlan", JSON.stringify(plan));
      message.success(`今日计划生成成功：${plan.items.length}/${plan.dailyQuota}`);
    } catch (e) {
      console.error(e);
      message.error("生成今日计划失败");
    }
    setLoading(false);
  };

  const loadPlanFromStorage = () => {
    try {
      const raw = sessionStorage.getItem("todayPlan");
      if (!raw) return;
      const plan = JSON.parse(raw);
      setPerBook(plan.perWordbookQuota || []);
      setItems(plan.items || []);
    } catch {}
  };

  useEffect(() => {
    loadPlanFromStorage();
  }, []);

  // 加载“我的奖励”列表（兼容同步/异步返回）
  useEffect(() => {
    const res: any = getUserRewards({ userId } as any);
    if (res && typeof res.then === "function") {
      (res as Promise<any[]>)
        .then((list) => setRewards(Array.isArray(list) ? list : []))
        .catch(console.error);
    } else {
      setRewards(Array.isArray(res) ? res : []);
    }
  }, [userId]);

  // 读取 streak（优先 store，其次 localStorage）
  const userStats = useAppStore(s => s.userStats);
  useEffect(() => {
    const storeStreak = userStats?.streak ?? 0;
    const localStreak = Number(localStorage.getItem('streak') || '0');
    setStreak(Math.max(storeStreak, localStreak));
  }, [userStats?.streak]);

  // 奖励提示：达到配额或接近配额时给出轻量引导
  useEffect(() => {
    if (totalSelected >= dailyQuota) {
      setRewardHint('今日目标达成，解锁「专注徽章」！');
    } else if (totalSelected >= Math.floor(dailyQuota * 0.8)) {
      setRewardHint('再接再厉！完成目标将解锁「专注徽章」');
    } else {
      setRewardHint(null);
    }
  }, [totalSelected, dailyQuota]);

  const perBookColumns = [
    { title: "词书ID", dataIndex: "wordbookId", key: "wordbookId", width: 100 },
    { title: "词书名", dataIndex: "wordbookName", key: "wordbookName", render: (v: string, r: PerBookQuota) => v || `词书 #${r.wordbookId}` },
    { title: "到期", dataIndex: "dueCount", key: "dueCount", width: 100 },
    { title: "24h内", dataIndex: "upcomingCount", key: "upcomingCount", width: 100 },
    { title: "今日分配", dataIndex: "quota", key: "quota", width: 120 },
    { title: "操作", key: "action", width: 160, render: (_: any, r: PerBookQuota) => (
      <Button size="small" onClick={() => navigate(`/learning-session/wordbook/${r.wordbookId}`)}>
        开始该词书会话
      </Button>
    )},
  ];

  const itemsColumns = [
    { title: "单词", dataIndex: "word", key: "word" },
    { title: "词书ID", dataIndex: "wordbookId", key: "wordbookId", width: 100 },
    { title: "下一次复习", dataIndex: "nextReview", key: "nextReview", width: 200, render: (v: string) => new Date(v).toLocaleString() },
    { title: "可提取性", dataIndex: "retrievability", key: "retrievability", width: 140, render: (v: number | undefined) => {
      const color = v === undefined ? "default" : (v >= 0.8 ? "green" : (v >= 0.6 ? "blue" : (v >= 0.4 ? "orange" : "red")));
      return <Tag color={color}>{v === undefined ? "-" : `${Math.round(v * 100)}%`}</Tag>;
    } },
  ];

  return (
    <div style={{ padding: 16 }}>
      {/* 顶部固定工具条（简单实现：非 fixed，后续可升级为 fixed 并在内容区设置 padding-top） */}
      <Card>
        <Row align="middle" gutter={[16, 16]} style={{ width: "100%" }}>
          <Col xs={24} md={8} style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Progress type="circle" percent={progressPct} size={isMobile ? 80 : 100} status={progressPct >= 100 ? "success" : "active"} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Title level={4} style={{ margin: 0 }}>今日计划</Title>
              <Text type="secondary">已选取 {totalSelected} / 配额 {dailyQuota}</Text>
              <Space>
                <Badge count={streak} color="#fa8c16" overflowCount={999} />
                <Text><FireOutlined style={{ color: "#fa8c16" }} /> 连击</Text>
              </Space>
              {rewardHint && (
                <Tag color="gold"><GiftOutlined /> {rewardHint}</Tag>
              )}
            </div>
          </Col>
          <Col xs={24} md={10}>
            <Row gutter={12}>
              <Col span={12}>
                <Statistic title="完成度" value={progressPct} suffix="%" prefix={<TrophyOutlined />} valueStyle={{ fontSize: isMobile ? 16 : 18 }} />
              </Col>
              <Col span={12}>
                <Statistic title="预计用时" value={Math.max(5, Math.ceil(totalSelected * 0.5))} suffix="min" valueStyle={{ fontSize: isMobile ? 16 : 18 }} />
              </Col>
            </Row>
            <div style={{ marginTop: 12 }}>
              <Space wrap>
                <Button icon={<ReloadOutlined />} onClick={generatePlan} loading={loading}>生成/重生成</Button>
                <Button icon={<PlayCircleOutlined />} type="primary" onClick={() => {
                  if (items.length === 0) {
                    message.warning("请先生成今日计划");
                    return;
                  }
                  message.success("进入全局会话");
                  navigate("/learning-session/global");
                }}>
                  开始今日计划（全局）
                </Button>
              </Space>
            </div>
          </Col>
          <Col xs={24} md={6} style={{ display: "flex", justifyContent: isMobile ? "flex-start" : "flex-end" }}>
            <Space>
              <Text>包含24小时内即将到期</Text>
              <Switch checked={includeUpcoming} onChange={(v) => { setIncludeUpcoming(v); }} />
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: 12 }}>
        <Col span={24}>
          <Card title="词书分配总览">
            {perBook.length > 0 ? (
              <>
                {isMobile && perBook.length > 0 && (
                <Row gutter={[8, 8]} style={{ marginBottom: 8 }}>
                  {perBook.map((pb) => (
                    <Col xs={24} key={pb.wordbookId}>
                      <Card size="small">
                        <Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
                          <Space>
                            <Text strong>{pb.wordbookName || `词书 #${pb.wordbookId}`}</Text>
                            <Tag>{`到期 ${pb.dueCount}`}</Tag>
                            <Tag>{`24h内 ${pb.upcomingCount}`}</Tag>
                            <Tag color="processing">{`今日分配 ${pb.quota}`}</Tag>
                          </Space>
                          <Button size="small" onClick={() => navigate(`/learning-session/wordbook/${pb.wordbookId}`)}>
                            开始
                          </Button>
                        </Space>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
              <Table
                rowKey="wordbookId"
                size={isMobile ? "small" : "middle"}
                columns={perBookColumns as any}
                dataSource={perBook}
                pagination={false}
              />
              </>
            ) : (
              <Empty description="尚未生成今日计划" />
            )}
          </Card>
        </Col>

        <Col span={24}>
          <Card title="全局待学明细">
            {items.length > 0 ? (
              <>
                <div style={{ marginBottom: 8 }}>
                  <Space wrap>
                    <Text>筛选词书</Text>
                    <Select
                      size={isMobile ? "small" : "middle"}
                      style={{ minWidth: 180 }}
                      value={wbFilter}
                      onChange={(v) => {
                        setWbFilter(v as any);
                        setPage(1);
                      }}
                      options={[
                        { label: "全部", value: "all" },
                        ...perBook.map(pb => ({
                          label: pb.wordbookName || `词书 #${pb.wordbookId}`,
                          value: pb.wordbookId
                        }))
                      ]}
                    />
                  </Space>
                </div>
                {isMobile && selectedPageItems.length > 0 && (
                  <Row gutter={[8, 8]} style={{ marginBottom: 8 }}>
                    {selectedPageItems.map((it) => (
                      <Col xs={24} key={it.id}>
                        <Card size="small">
                          <Space direction="vertical" style={{ width: "100%" }}>
                            <Text strong>{it.word}</Text>
                            <Space wrap>
                              <Tag>{`词书 #${it.wordbookId}`}</Tag>
                              <Tag color="default">{new Date(it.nextReview).toLocaleString()}</Tag>
                              <Tag color={it.retrievability === undefined ? "default" : (it.retrievability >= 0.8 ? "green" : (it.retrievability >= 0.6 ? "blue" : (it.retrievability >= 0.4 ? "orange" : "red")))}>
                                {it.retrievability === undefined ? "-" : `${Math.round(it.retrievability * 100)}%`}
                              </Tag>
                            </Space>
                          </Space>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                )}
                <Table
                  rowKey="id"
                  size={isMobile ? "small" : "middle"}
                  columns={itemsColumns as any}
                  dataSource={selectedPageItems}
                  pagination={false}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                  <Pagination
                    size={isMobile ? "small" : "default"}
                    current={page}
                    pageSize={pageSize}
                    total={items.length}
                    showSizeChanger
                    onChange={(p, ps) => { setPage(p); setPageSize(ps); }}
                  />
                </div>
              </>
            ) : (
              <Empty description="尚未生成今日计划或没有待学项目" />
            )}
          </Card>
        </Col>
      </Row>

      {/* 我的奖励列表 */}
      <Card title="我的奖励" style={{ marginTop: 12 }}>
        {rewards && rewards.length > 0 ? (
          <Row gutter={[8, 8]}>
            {rewards.map((r: any) => (
              <Col xs={24} md={12} key={r.id || r.title}>
                <Card size="small">
                  <Space direction="vertical" style={{ width: "100%" }}>
                    <Space>
                      <Tag color="gold">{r.type || '奖励'}</Tag>
                      <Text strong>{r.title}</Text>
                    </Space>
                    {r.desc && <Text type="secondary">{r.desc}</Text>}
                    {r.grantedAt && <Text type="secondary" style={{ fontSize: 12 }}>{new Date(r.grantedAt).toLocaleString()}</Text>}
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          <Empty description="暂无奖励，完成学习或更新进度后将评估授予" />
        )}
      </Card>

      <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
        <Button onClick={async () => {
          try {
            const res = await aggregateDailyStudyAndUpdateProgress({ userId });
            message.success(`已更新 ${res.updatedWordbooks.length} 个词书进度`);
            // 进度更新后触发奖励评估
            try {
              const evalRes = evaluateRewardsOnEvent({ userId, eventType: 'progressUpdated', dailyQuota });
              if (Array.isArray(evalRes.granted) && evalRes.granted.length > 0) {
                message.success(`🎖 奖励新增 ${evalRes.granted.length} 项`);
              }
              const latest = await getUserRewards({ userId });
              setRewards(Array.isArray(latest) ? latest : []);
            } catch (err) {
              console.error('evaluate rewards failed', err);
            }
          } catch (e) {
            console.error(e);
            message.error("更新进度失败");
          }
        }}>
          更新词书进度
        </Button>
      </div>
    </div>
  );
}