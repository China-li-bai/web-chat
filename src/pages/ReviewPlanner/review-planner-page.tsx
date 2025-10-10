import React, { useEffect, useMemo, useState } from "react";
import { Card, Row, Col, Switch, Button, Segmented, Table, Pagination, Empty, Typography, Space, message } from "antd";
import { ReloadOutlined, PlayCircleOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { getReviewQueueGroupedByWordbook, getDueItems, createLearningSessionForWordbookExtended } from "@/services/learningService";
import { useAppStore } from "@/store/useAppStore";

const { Title, Text } = Typography;

type GroupItem = {
    wordbookId: number;
    wordbookName: string;
    dueCount: number;
    upcomingCount: number;
    totalPlanned: number;
};

type DueItem = {
    id: string;
    word: string;
    nextReview: string;
    retrievability?: number;
};

const letters = [
    "ALL", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
    "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "#"
];

export default function ReviewPlannerPage() {
    const navigate = useNavigate();
    // TODO: 从全局 store 获取 userId
    const userId = useAppStore((state) => state.userId);

    // 全局时间窗：仅到期 or 含24小时内
    const [includeUpcoming, setIncludeUpcoming] = useState<boolean>(false);

    // 分组数据（按词书）
    const [groups, setGroups] = useState<GroupItem[]>([]);
    const [groupsLoading, setGroupsLoading] = useState<boolean>(false);
    const [groupsPage, setGroupsPage] = useState<number>(1);
    const [groupsPageSize, setGroupsPageSize] = useState<number>(10);
    const [groupsTotal, setGroupsTotal] = useState<number>(0);

    // 当前选中的词书
    const [activeWordbookId, setActiveWordbookId] = useState<number | null>(null);

    // 首字母筛选
    const [startsWith, setStartsWith] = useState<string>("ALL");

    // 候选词（该词书下到期/含24h内，且按字母过滤）
    const [dueItems, setDueItems] = useState<DueItem[]>([]);
    const [dueLoading, setDueLoading] = useState<boolean>(false);
    const [duePage, setDuePage] = useState<number>(1);
    const [duePageSize, setDuePageSize] = useState<number>(50);
    const [dueTotal, setDueTotal] = useState<number>(0);

    const timeWindowHours = includeUpcoming ? 24 : 0;

    const fetchGroups = async () => {
        setGroupsLoading(true);
        try {
            const res = await getReviewQueueGroupedByWordbook({
                userId,
                timeWindowHours,
                page: groupsPage,
                pageSize: groupsPageSize,
            });
            setGroups(res.items as any);
            setGroupsTotal(res.total);
        } catch (e) {
            console.error(e);
            message.error("加载复习计划分组失败");
        }
        setGroupsLoading(false);
    };

    const effectiveStartsWith = useMemo(() => {
        if (startsWith === "ALL") return undefined;
        return startsWith;
    }, [startsWith]);

    const fetchDueItems = async () => {
        if (!activeWordbookId) {
            setDueItems([]);
            setDueTotal(0);
            return;
        }
        setDueLoading(true);
        try {
            const res = await getDueItems({
                userId,
                wordbookId: activeWordbookId,
                includeUpcoming,
                startsWith: effectiveStartsWith,
                page: duePage,
                pageSize: duePageSize,
            });
            setDueItems(res.items as any);
            setDueTotal(res.total);
        } catch (e) {
            console.error(e);
            message.error("加载到期词条失败");
        }
        setDueLoading(false);
    };

    useEffect(() => {
        fetchGroups();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [includeUpcoming, groupsPage, groupsPageSize]);

    useEffect(() => {
        fetchDueItems();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeWordbookId, includeUpcoming, effectiveStartsWith, duePage, duePageSize]);

    const onStartReview = async () => {
        if (!activeWordbookId) {
            message.warning("请先选择词书");
            return;
        }
        try {
            await createLearningSessionForWordbookExtended({
                userId,
                wordbookId: activeWordbookId,
                includeUpcoming,
                startsWith: effectiveStartsWith,
            });
            navigate(`/learning-session/${activeWordbookId}`);
        } catch (e) {
            console.error(e);
            message.error("进入复习会话失败");
        }
    };

    const groupsColumns = [
        { title: "词书ID", dataIndex: "wordbookId", key: "wordbookId", width: 100 },
        { title: "词书名", dataIndex: "wordbookName", key: "wordbookName", render: (v: string, r: GroupItem) => v || `词书 #${r.wordbookId}` },
        { title: "到期", dataIndex: "dueCount", key: "dueCount", width: 100 },
        { title: "24h内", dataIndex: "upcomingCount", key: "upcomingCount", width: 100 },
        { title: "已安排", dataIndex: "totalPlanned", key: "totalPlanned", width: 120 },
        {
            title: "操作",
            key: "action",
            width: 140,
            render: (_: any, record: GroupItem) => (
                <Space>
                    <Button type={activeWordbookId === record.wordbookId ? "primary" : "default"} onClick={() => {
                        setActiveWordbookId(record.wordbookId);
                        setDuePage(1);
                    }}>
                        查看
                    </Button>
                    <Button icon={<PlayCircleOutlined />} onClick={() => {
                        setActiveWordbookId(record.wordbookId);
                        setDuePage(1);
                        setTimeout(onStartReview, 0);
                    }}>
                        开始复习
                    </Button>
                </Space>
            )
        },
    ];

    const dueColumns = [
        { title: "单词", dataIndex: "word", key: "word" },
        { title: "下一次复习", dataIndex: "nextReview", key: "nextReview", width: 200, render: (v: string) => new Date(v).toLocaleString() },
        { title: "可提取性", dataIndex: "retrievability", key: "retrievability", width: 140, render: (v: number | undefined) => v === undefined ? "-" : `${Math.round(v * 100)}%` },
    ];

    return (
        <div style={{ padding: 16 }}>
            <Row gutter={[16, 16]}>
                <Col span={24}>
                    <Card>
                        <Space align="center" style={{ width: "100%", justifyContent: "space-between" }}>
                            <Space>
                                <Title level={4} style={{ margin: 0 }}>复习计划（FSRS 间隔驱动）</Title>
                                <Button icon={<ReloadOutlined />} onClick={fetchGroups}>刷新</Button>
                            </Space>
                            <Space>
                                <Text>包含24小时内即将到期</Text>
                                <Switch checked={includeUpcoming} onChange={setIncludeUpcoming} />
                            </Space>
                        </Space>
                        <div style={{ marginTop: 12 }}>
                            <Table
                                rowKey="wordbookId"
                                size="middle"
                                loading={groupsLoading}
                                columns={groupsColumns as any}
                                dataSource={groups}
                                pagination={false}
                            />
                            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                                <Pagination
                                    current={groupsPage}
                                    pageSize={groupsPageSize}
                                    total={groupsTotal}
                                    showSizeChanger
                                    onChange={(p, ps) => { setGroupsPage(p); setGroupsPageSize(ps); }}
                                />
                            </div>
                        </div>
                    </Card>
                </Col>

                <Col span={24}>
                    <Card>
                        <Space align="center" style={{ width: "100%", justifyContent: "space-between" }}>
                            <Space>
                                <Title level={5} style={{ margin: 0 }}>候选词（选择词书后显示）</Title>
                                {activeWordbookId ? <Text type="secondary">词书 #{activeWordbookId}</Text> : <Text type="secondary">未选择词书</Text>}
                            </Space>
                            <Space>
                                <Button type="primary" icon={<PlayCircleOutlined />} onClick={onStartReview} disabled={!activeWordbookId || dueItems.length === 0}>
                                    开始复习
                                </Button>
                            </Space>
                        </Space>

                        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <Segmented
                                size="small"
                                value={startsWith}
                                onChange={(val) => { setStartsWith(String(val)); setDuePage(1); }}
                                options={letters.map(l => ({ label: l, value: l }))}
                            />
                        </div>

                        <div style={{ marginTop: 12 }}>
                            {activeWordbookId ? (
                                <>
                                    <Table
                                        rowKey="id"
                                        size="middle"
                                        loading={dueLoading}
                                        columns={dueColumns as any}
                                        dataSource={dueItems}
                                        pagination={false}
                                        locale={{ emptyText: <Empty description="无到期词条" /> }}
                                    />
                                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                                        <Pagination
                                            current={duePage}
                                            pageSize={duePageSize}
                                            total={dueTotal}
                                            showSizeChanger
                                            onChange={(p, ps) => { setDuePage(p); setDuePageSize(ps); }}
                                        />
                                    </div>
                                </>
                            ) : (
                                <Empty description="请选择上方的词书以查看候选词" />
                            )}
                        </div>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}