import React, { useState } from 'react';
import { Card, Row, Col, Form, Input, Select, Switch, Button, Space, Typography, Tabs, Divider, message } from 'antd';
import { CopyOutlined, SendOutlined, ThunderboltOutlined, RobotOutlined, LinkOutlined, FileTextOutlined } from '@ant-design/icons';
import Prompts from '@/modules/ai/prompts/Prompts';
import { callModelFreePriority } from '@/modules/ai';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const MBTI_OPTIONS = [
  'INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP',
  'ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'
];

const PLATFORM_OPTIONS = [
  { label: '小红书', value: 'Xiaohongshu' },
  { label: '微信公众号', value: 'WeChat Official Accounts' },
  { label: 'Twitter', value: 'Twitter' },
  { label: 'Facebook', value: 'Facebook' },
];

function extractJson(text) {
  // Attempt direct JSON parse first
  try { return JSON.parse(text); } catch (_) {}
  // Fallback: extract first {...} block
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    const candidate = text.slice(start, end + 1);
    try { return JSON.parse(candidate); } catch (_) {}
  }
  return null;
}

export default function MarketingCopilot() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [rawOutput, setRawOutput] = useState('');
  const [jsonOutput, setJsonOutput] = useState(null);

  const initialValues = {
    userGoal: '提升新品的社媒曝光与转化',
    productName: 'Example Product',
    productUSP: '更快、更轻、更智能的体验',
    targetAudience: '注重效率与审美的年轻专业人群',
    personaMBTI: 'ENFP',
    brandVoice: 'playful, minimalist, visionary',
    platforms: PLATFORM_OPTIONS.map(p => p.value),
    outputLanguage: 'zh-CN',
    includeEmojis: true,
    includeHashtags: true,
    includeLinks: true,
    websiteUrl: '',
    sampleLinks: '',
    mvpFocus: true,
  };

  const handleGenerate = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      setJsonOutput(null);
      setRawOutput('');
      const prompt = await Prompts.get('marketing-copywriter', {
        userGoal: values.userGoal,
        productName: values.productName,
        productUSP: values.productUSP,
        targetAudience: values.targetAudience,
        personaMBTI: values.personaMBTI,
        brandVoice: values.brandVoice,
        platforms: JSON.stringify(values.platforms),
        outputLanguage: values.outputLanguage,
        includeEmojis: String(values.includeEmojis),
        includeHashtags: String(values.includeHashtags),
        includeLinks: String(values.includeLinks),
        websiteUrl: values.websiteUrl || '',
        sampleLinks: values.sampleLinks || '',
        mvpFocus: String(values.mvpFocus),
      });
      const text = await callModelFreePriority(`${prompt}`);
      const parsed = extractJson(text || '');
      setRawOutput(text || '');
      if (parsed) {
        setJsonOutput(parsed);
      } else {
        message.warning('AI 返回不可解析的文本，已显示原文');
      }
    } catch (e) {
      const msg = String(e?.message || e);
      message.error(`生成失败：${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text || '');
      message.success('已复制到剪贴板');
    } catch {
      message.error('复制失败');
    }
  };

  const renderPlatformTab = (platform) => {
    const contentStr = (platform?.content || []).join('\n\n');
    const emojisStr = (platform?.emojis || []).join(' ');
    const hashtagsStr = (platform?.hashtags || []).map(h => `#${h.replace(/^#/, '')}`).join(' ');
    const linksStr = (platform?.links || []).join('\n');

    const fullPublishText = [
      platform?.title,
      contentStr,
      emojisStr,
      hashtagsStr,
      linksStr,
      platform?.cta
    ].filter(Boolean).join('\n\n');

    return (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Card>
          <Space style={{ marginBottom: 8 }}>
            <Button icon={<CopyOutlined />} onClick={() => handleCopy(fullPublishText)}>复制整段</Button>
            {platform?.name === 'Twitter' && (
              <Button icon={<SendOutlined />} onClick={() => {
                const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(fullPublishText)}`;
                window.open(intent, '_blank');
              }}>打开推文发布</Button>
            )}
          </Space>
          <Paragraph><Text strong>标题：</Text>{platform?.title}</Paragraph>
          <Divider style={{ margin: '12px 0' }} />
          <TextArea rows={12} value={fullPublishText} readOnly />
        </Card>
      </Space>
    );
  };

  const platformTabs = () => {
    if (!jsonOutput) return null;
    const items = (jsonOutput?.platforms || []).map((p, idx) => ({
      key: `${p?.name || idx}`,
      label: p?.name || `Platform ${idx+1}`,
      children: renderPlatformTab(p)
    }));
    return <Tabs items={items} />;
  };

  return (
    <div className="page-container">
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={10}>
          <Card title={<Space><RobotOutlined /><span>智能文案生成器</span></Space>}>
            <Form form={form} layout="vertical" initialValues={initialValues}>
              <Form.Item name="userGoal" label="目标">
                <Input placeholder="例如：新品首发提升曝光与转化" />
              </Form.Item>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="productName" label="产品名称" rules={[{ required: true, message: '必填' }]}>
                    <Input placeholder="产品名称" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="targetAudience" label="目标人群">
                    <Input placeholder="核心受众（如：职场新人、设计师）" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="productUSP" label="核心卖点 (USP)" rules={[{ required: true, message: '必填' }]}>
                <Input placeholder="一句话讲清差异化价值" />
              </Form.Item>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="personaMBTI" label="人格（MBTI）">
                    <Select options={MBTI_OPTIONS.map(m => ({ label: m, value: m }))} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="brandVoice" label="品牌语气">
                    <Input placeholder="如：playful / minimalist / visionary" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="platforms" label="平台选择" rules={[{ required: true, message: '至少选择1个平台' }]}>
                <Select mode="multiple" options={PLATFORM_OPTIONS} />
              </Form.Item>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="outputLanguage" label="输出语言">
                    <Select options={[
                      { label: '中文(简体)', value: 'zh-CN' },
                      { label: 'English', value: 'en-US' },
                    ]} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="websiteUrl" label="网站链接">
                    <Input addonBefore={<LinkOutlined />} placeholder="https://..." />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="sampleLinks" label="示例链接（逗号分隔）">
                <Input placeholder="https://a.com, https://b.com" />
              </Form.Item>
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item name="includeEmojis" label="表情符号" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="includeHashtags" label="话题标签" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="includeLinks" label="包含链接" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="mvpFocus" label="遵循 MVP 最小可执行" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Space>
                <Button type="primary" icon={<ThunderboltOutlined />} loading={loading} onClick={handleGenerate}>
                  生成文案
                </Button>
                <Button icon={<FileTextOutlined />} onClick={() => {
                  const text = jsonOutput ? JSON.stringify(jsonOutput, null, 2) : rawOutput;
                  const blob = new Blob([text || ''], { type: 'text/plain;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = jsonOutput ? 'marketing.json' : 'marketing.txt';
                  a.click();
                  URL.revokeObjectURL(url);
                }}>导出内容</Button>
              </Space>
            </Form>
          </Card>
        </Col>
        <Col xs={24} xl={14}>
          <Card title={<Space><FileTextOutlined /><span>生成结果</span></Space>}>
            {!jsonOutput && !rawOutput && (
              <Paragraph type="secondary">点击「生成文案」后在此预览多平台可直接发布的内容。</Paragraph>
            )}
            {jsonOutput && platformTabs()}
            {!jsonOutput && rawOutput && (
              <>
                <Space style={{ marginBottom: 8 }}>
                  <Button icon={<CopyOutlined />} onClick={() => handleCopy(rawOutput)}>复制全文</Button>
                </Space>
                <TextArea rows={18} value={rawOutput} readOnly />
              </>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}